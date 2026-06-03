const supabase = require("../config/supabase");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const defaultDepartments = [];

const conditions = ["good", "outdated", "for_repair", "for_replacement", "missing"];
const departmentsDataFile = path.join(__dirname, "..", "data", "departments.json");
const localItemsDataFile = path.join(__dirname, "..", "data", "inventory-items.json");
const canUseLocalJsonFallback = process.env.VERCEL !== "1";
const fallbackStorageBucket = "inventory";
const fallbackDepartmentsPath = "app-data/departments.json";
const fallbackItemsPath = "app-data/inventory-items.json";

const isMissingDepartmentsTableError = (error) => (
  error?.code === "42P01" ||
  error?.message?.includes("departments") ||
  error?.message?.includes("schema cache")
);

const departmentMigrationError = "The database still has the old fixed department rule. Run backend/sql/add-departments.sql in Supabase SQL editor before adding equipment to newly created departments.";
const departmentsTableMigrationError = "Department storage is not available. Confirm the Supabase inventory storage bucket exists, or run backend/sql/add-departments.sql in Supabase SQL editor.";

const normalizeDepartmentName = (value = "") => String(value).trim().replace(/\s+/g, " ");

const slugifyDepartment = (value = "") => normalizeDepartmentName(value)
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const labelFromDepartmentSlug = (slug = "") => String(slug)
  .split("-")
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const normalizeDepartmentRows = (rows = []) => rows.map((department) => ({
  slug: department.slug,
  name: department.name || labelFromDepartmentSlug(department.slug)
}));

const dedupeDepartments = (departments = []) => {
  const seen = new Set();
  return departments.filter((department) => {
    if (!department?.slug || seen.has(department.slug)) return false;
    seen.add(department.slug);
    return true;
  });
};

const readLocalDepartments = () => {
  if (!canUseLocalJsonFallback) return defaultDepartments;

  try {
    if (!fs.existsSync(departmentsDataFile)) return defaultDepartments;
    const departments = JSON.parse(fs.readFileSync(departmentsDataFile, "utf8"));
    return dedupeDepartments(normalizeDepartmentRows(departments));
  } catch (error) {
    return defaultDepartments;
  }
};

const writeLocalDepartments = (departments) => {
  if (!canUseLocalJsonFallback) {
    throw new Error(departmentsTableMigrationError);
  }

  fs.mkdirSync(path.dirname(departmentsDataFile), { recursive: true });
  fs.writeFileSync(
    departmentsDataFile,
    `${JSON.stringify(dedupeDepartments(departments), null, 2)}\n`
  );
};

const readLocalItems = () => {
  if (!canUseLocalJsonFallback) return [];

  try {
    if (!fs.existsSync(localItemsDataFile)) return [];
    const items = JSON.parse(fs.readFileSync(localItemsDataFile, "utf8"));
    return Array.isArray(items) ? items : [];
  } catch (error) {
    return [];
  }
};

const writeLocalItems = (items) => {
  if (!canUseLocalJsonFallback) {
    throw new Error(departmentMigrationError);
  }

  fs.mkdirSync(path.dirname(localItemsDataFile), { recursive: true });
  fs.writeFileSync(localItemsDataFile, `${JSON.stringify(items, null, 2)}\n`);
};

const readStorageJson = async (filePath, fallbackValue) => {
  const { data, error } = await supabase.storage.from(fallbackStorageBucket).download(filePath);

  if (error) {
    if (
      error.statusCode === "404" ||
      error.message?.includes("not found") ||
      error.message?.includes("The resource was not found")
    ) {
      return fallbackValue;
    }
    throw error;
  }

  const text = typeof data?.text === "function"
    ? await data.text()
    : Buffer.from(await data.arrayBuffer()).toString("utf8");

  if (!text.trim()) return fallbackValue;
  return JSON.parse(text);
};

const isMissingStorageBucketError = (error) => (
  error?.statusCode === "404" ||
  error?.message?.toLowerCase().includes("bucket not found") ||
  error?.message?.toLowerCase().includes("not found")
);

const ensureFallbackStorageBucket = async () => {
  const { error } = await supabase.storage.createBucket(fallbackStorageBucket, {
    public: true
  });

  if (error && !error.message?.toLowerCase().includes("already exists")) {
    throw error;
  }
};

const writeStorageJson = async (filePath, value) => {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  let { error } = await supabase.storage.from(fallbackStorageBucket).upload(filePath, body, {
    contentType: "application/json",
    upsert: true
  });

  if (error && isMissingStorageBucketError(error)) {
    await ensureFallbackStorageBucket();
    ({ error } = await supabase.storage.from(fallbackStorageBucket).upload(filePath, body, {
      contentType: "application/json",
      upsert: true
    }));
  }

  if (error) throw error;
};

const readFallbackDepartments = async () => {
  if (canUseLocalJsonFallback) return readLocalDepartments();

  const departments = await readStorageJson(fallbackDepartmentsPath, defaultDepartments);
  return dedupeDepartments(normalizeDepartmentRows(Array.isArray(departments) ? departments : defaultDepartments));
};

const writeFallbackDepartments = async (departments) => {
  if (canUseLocalJsonFallback) {
    writeLocalDepartments(departments);
    return;
  }

  await writeStorageJson(fallbackDepartmentsPath, dedupeDepartments(departments));
};

const readFallbackItems = async () => {
  if (canUseLocalJsonFallback) return readLocalItems();

  const items = await readStorageJson(fallbackItemsPath, []);
  return Array.isArray(items) ? items : [];
};

const writeFallbackItems = async (items) => {
  if (canUseLocalJsonFallback) {
    writeLocalItems(items);
    return;
  }

  await writeStorageJson(fallbackItemsPath, items);
};

const findFallbackItem = async (itemId) => (await readFallbackItems()).find((item) => String(item.id) === String(itemId));

const isNumericItemId = (itemId) => /^\d+$/.test(String(itemId || ""));

const isDepartmentConstraintError = (error) => (
  error?.message?.includes("inventory_items_department_check") ||
  (
    error?.message?.includes("violates check constraint") &&
    error?.message?.includes("department")
  )
);

const createLocalItem = (req, item) => ({
  id: crypto.randomUUID(),
  department: item.department,
  name: item.name,
  quantity: item.quantity,
  condition: item.condition,
  acquisition_date: item.acquisition_date || null,
  comments: item.comments || "",
  image_url: item.image_url || null,
  video_url: item.video_url || null,
  created_by: req.user?.id || null,
  created_at: new Date().toISOString(),
  stored_locally: true
});

const getDepartments = async (db) => {
  const { data, error } = await db
    .from("departments")
    .select("slug, name")
    .order("name", { ascending: true });

  if (error) {
    if (isMissingDepartmentsTableError(error)) {
      return readFallbackDepartments();
    }
    throw error;
  }

  return dedupeDepartments(normalizeDepartmentRows(data));
};

const departmentsFromItems = (items = []) => dedupeDepartments(items
  .map((item) => ({
    slug: item.department,
    name: labelFromDepartmentSlug(item.department)
  }))
);

const getDisplayDepartments = async (db, items = []) => dedupeDepartments([
  ...await getDepartments(db),
  ...await readFallbackDepartments(),
  ...departmentsFromItems(items)
]);

const departmentExists = async (db, slug) => {
  const departments = await getDisplayDepartments(db);
  return departments.some((department) => department.slug === slug);
};

const handleInventoryError = (res, error) => {
  if (isDepartmentConstraintError(error)) {
    return res.status(500).json({
      error: departmentMigrationError
    });
  }

  if (error?.message?.includes("inventory_items_condition_check")) {
    return res.status(500).json({
      error: "Database condition constraint is outdated. Run backend/sql/allow-missing-condition.sql in Supabase SQL editor."
    });
  }

  if (
    error?.message?.includes("acquisition_date") &&
    error?.message?.includes("schema cache")
  ) {
    return res.status(500).json({
      error: "Database schema is missing acquisition_date or Supabase has not refreshed it yet. Run backend/sql/add-acquisition-date.sql in Supabase SQL editor, then restart the backend."
    });
  }

  return res.status(500).json({ error: error.message });
};

const isMissingActivityTableError = (error) => (
  error?.code === "42P01" ||
  error?.message?.includes("inventory_activity") ||
  error?.message?.includes("schema cache")
);

const isValidDateValue = (value) => {
  if (!value) return true;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const getApiInfo = (req, res) => {
  res.json({
    message: "Wellspring Inventory API",
    endpoints: {
      dashboard: "GET /api/inventory/dashboard",
      report: "GET /api/inventory/report",
      activity: "GET /api/inventory/activity",
      media: "GET /api/inventory/media",
      departments: "GET /api/inventory/departments",
      createDepartment: "POST /api/inventory/departments",
      deleteDepartment: "DELETE /api/inventory/departments/:slug",
      departmentItems: "GET /api/inventory/department/:dept",
      createItem: "POST /api/inventory/items",
      updateItem: "PUT /api/inventory/items/:id",
      deleteItem: "DELETE /api/inventory/items/:id",
      upload: "POST /api/inventory/upload"
    }
  });
};

const itemSnapshotFields = "id, department, name, quantity, condition, acquisition_date, comments, image_url, video_url, created_by, created_at";

const buildActivityRecord = (action, item, createdAt = new Date().toISOString(), actorId = null) => ({
  action,
  item_id: item.id,
  department: item.department,
  name: item.name,
  quantity: item.quantity,
  condition: item.condition,
  acquisition_date: item.acquisition_date,
  comments: item.comments,
  image_url: item.image_url,
  video_url: item.video_url,
  item_created_at: item.created_at,
  created_by: actorId,
  created_at: createdAt
});

const normalizeActivityRows = (rows = []) => rows.map((row) => {
  const snapshot = row.snapshot || {};
  return buildActivityRecord(
    row.action,
    {
      id: row.item_id || snapshot.id,
      department: snapshot.department,
      name: snapshot.name,
      quantity: snapshot.quantity,
      condition: snapshot.condition,
      acquisition_date: snapshot.acquisition_date,
      comments: snapshot.comments,
      image_url: snapshot.image_url,
      video_url: snapshot.video_url,
      created_by: snapshot.created_by,
      created_at: snapshot.created_at
    },
    row.created_at,
    row.created_by
  );
});

const logInventoryActivity = async (db, req, action, item) => {
  if (!item?.id) return;

  const { error } = await db.from("inventory_activity").insert({
    item_id: item.id,
    action,
    snapshot: item,
    created_by: req.user?.id || null
  });

  if (error && !isMissingActivityTableError(error)) throw error;
};

const getDashboard = async (req, res) => {
  try {
    const db = supabase.forRequest(req);
    const { data: items, error } = await db.from("inventory_items").select("department, condition, quantity");
    if (error) throw error;
    const allItems = [...items, ...(await readFallbackItems())];
    const departments = await getDisplayDepartments(db, allItems);

    const departmentTotals = departments.reduce((totals, department) => {
      totals[department.slug] = 0;
      return totals;
    }, {});

    const counts = {
      total: allItems.length,
      departments: departments.length,
      departmentList: departments,
      departmentTotals,
      good: 0,
      outdated: 0,
      repair: 0,
      replacement: 0,
      missing: 0
    };

    counts.total = allItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

    allItems.forEach((item) => {
      const quantity = Number(item.quantity) || 1;
      if (Object.prototype.hasOwnProperty.call(departmentTotals, item.department)) {
        departmentTotals[item.department] += quantity;
      }
      if (item.condition === "good") counts.good += quantity;
      if (item.condition === "outdated") counts.outdated += quantity;
      if (item.condition === "for_repair") counts.repair += quantity;
      if (item.condition === "for_replacement") counts.replacement += quantity;
      if (item.condition === "missing") counts.missing += quantity;
    });

    res.json(counts);
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const getReport = async (req, res) => {
  try {
    const db = supabase.forRequest(req);
    const { data: dbItems, error } = await db
      .from("inventory_items")
      .select("id, department, name, quantity, condition, acquisition_date, comments, created_at")
      .order("department", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    const items = [...dbItems, ...(await readFallbackItems())].sort((a, b) => (
      String(a.department).localeCompare(String(b.department)) ||
      String(a.name).localeCompare(String(b.name))
    ));
    const departments = await getDisplayDepartments(db, items);

    let activity = [];
    const { data: activityRows, error: activityError } = await db
      .from("inventory_activity")
      .select("id, item_id, action, snapshot, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (activityError && !isMissingActivityTableError(activityError)) throw activityError;
    if (!activityError) activity = normalizeActivityRows(activityRows);

    const summary = {
      total: 0,
      departments: departments.length,
      good: 0,
      outdated: 0,
      repair: 0,
      replacement: 0,
      missing: 0
    };

    const departmentSummary = departments.map((department) => ({
      department: department.slug,
      departmentName: department.name,
      total: 0,
      items: 0,
      good: 0,
      outdated: 0,
      repair: 0,
      replacement: 0,
      missing: 0
    }));

    const departmentLookup = departmentSummary.reduce((lookup, record) => {
      lookup[record.department] = record;
      return lookup;
    }, {});

    items.forEach((item) => {
      const quantity = Number(item.quantity) || 1;
      const departmentRecord = departmentLookup[item.department];

      summary.total += quantity;
      if (item.condition === "good") summary.good += quantity;
      if (item.condition === "outdated") summary.outdated += quantity;
      if (item.condition === "for_repair") summary.repair += quantity;
      if (item.condition === "for_replacement") summary.replacement += quantity;
      if (item.condition === "missing") summary.missing += quantity;

      if (!departmentRecord) return;
      departmentRecord.total += quantity;
      departmentRecord.items += 1;
      if (item.condition === "good") departmentRecord.good += quantity;
      if (item.condition === "outdated") departmentRecord.outdated += quantity;
      if (item.condition === "for_repair") departmentRecord.repair += quantity;
      if (item.condition === "for_replacement") departmentRecord.replacement += quantity;
      if (item.condition === "missing") departmentRecord.missing += quantity;
    });

    res.json({
      generatedAt: new Date().toISOString(),
      summary,
      departmentSummary,
      items,
      activity
    });
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const getActivity = async (req, res) => {
  try {
    const db = supabase.forRequest(req);
    const { data, error } = await db
      .from("inventory_activity")
      .select("id, item_id, action, snapshot, created_by, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) {
      const localItems = (await readFallbackItems()).map((item) => buildActivityRecord("added", item, item.created_at, item.created_by));
      return res.json([...localItems, ...normalizeActivityRows(data)]);
    }
    if (!isMissingActivityTableError(error)) throw error;

    const { data: items, error: itemsError } = await db
      .from("inventory_items")
      .select(itemSnapshotFields)
      .order("created_at", { ascending: false })
      .limit(50);

    if (itemsError) throw itemsError;
    const localItems = (await readFallbackItems()).map((item) => buildActivityRecord("added", item, item.created_at, item.created_by));
    res.json([
      ...localItems,
      ...items.map((item) => buildActivityRecord("added", item, item.created_at, item.created_by))
    ]);
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const getMedia = async (req, res) => {
  try {
    const db = supabase.forRequest(req);
    const { data, error } = await db
      .from("inventory_items")
      .select(itemSnapshotFields)
      .or("image_url.not.is.null,video_url.not.is.null")
      .order("created_at", { ascending: false });

    if (error) throw error;
    const localMediaItems = (await readFallbackItems()).filter((item) => item.image_url || item.video_url);
    res.json([...localMediaItems, ...data]);
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const listDepartments = async (req, res) => {
  try {
    const db = supabase.forRequest(req);
    const { data: items, error } = await db
      .from("inventory_items")
      .select("department");

    if (error) throw error;

    const departments = await getDisplayDepartments(db, [
      ...items,
      ...(await readFallbackItems())
    ]);
    res.json(departments);
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const createDepartment = async (req, res) => {
  const name = normalizeDepartmentName(req.body.name);
  const slug = slugifyDepartment(req.body.slug || name);

  if (!name) return res.status(400).json({ error: "Department name is required" });
  if (!slug) return res.status(400).json({ error: "Department name must include letters or numbers" });

  try {
    const db = supabase.forRequest(req);
    const { data, error } = await db
      .from("departments")
      .insert({
        slug,
        name,
        created_by: req.user?.id || null
      })
      .select("slug, name")
      .single();

    if (error?.code === "23505") {
      return res.status(409).json({ error: "A department with this name already exists" });
    }
    if (error && isMissingDepartmentsTableError(error)) {
      const departments = await readFallbackDepartments();
      const exists = departments.some((department) => (
        department.slug === slug ||
        department.name.toLowerCase() === name.toLowerCase()
      ));

      if (exists) {
        return res.status(409).json({ error: "A department with this name already exists" });
      }

      const department = { slug, name };
      await writeFallbackDepartments([...departments, department]);
      return res.status(201).json(department);
    }
    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const deleteDepartment = async (req, res) => {
  const slug = req.params.slug;

  try {
    const db = supabase.forRequest(req);
    const exists = await departmentExists(db, slug);
    if (!exists) return res.status(404).json({ error: "Department not found" });

    const { count, error: countError } = await db
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .eq("department", slug);

    if (countError) throw countError;
    const localCount = (await readFallbackItems()).filter((item) => item.department === slug).length;
    const itemCount = (count || 0) + localCount;
    if (itemCount > 0) {
      return res.status(400).json({
        error: `Move or delete the ${itemCount} equipment record${itemCount === 1 ? "" : "s"} in this department before deleting it.`
      });
    }

    const fallbackDepartments = await readFallbackDepartments();
    const updatedFallbackDepartments = fallbackDepartments.filter((department) => department.slug !== slug);
    const shouldUpdateFallback = updatedFallbackDepartments.length !== fallbackDepartments.length;

    const { error } = await db.from("departments").delete().eq("slug", slug);
    if (error && !isMissingDepartmentsTableError(error)) throw error;
    if (shouldUpdateFallback || isMissingDepartmentsTableError(error)) {
      await writeFallbackDepartments(updatedFallbackDepartments);
    }

    res.json({ success: true, message: "Department deleted" });
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const getDepartmentItems = async (req, res) => {
  const department = req.params.dept;

  try {
    const db = supabase.forRequest(req);
    const { data, error } = await db
      .from("inventory_items")
      .select("*")
      .eq("department", department)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const localItems = (await readFallbackItems()).filter((item) => item.department === department);
    if (!data.length && !localItems.length && !(await departmentExists(db, department))) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json([...localItems, ...data]);
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const createItem = async (req, res) => {
  const { department, name, quantity, condition, acquisition_date, comments, image_url, video_url } = req.body;
  const itemQuantity = Number(quantity);
  if (!name) return res.status(400).json({ error: "Item name is required" });
  if (!Number.isInteger(itemQuantity) || itemQuantity < 1) return res.status(400).json({ error: "Quantity must be at least 1" });
  if (!conditions.includes(condition)) return res.status(400).json({ error: "Invalid condition" });
  if (!isValidDateValue(acquisition_date)) return res.status(400).json({ error: "Invalid acquisition date" });

  try {
    const db = supabase.forRequest(req);
    if (!(await departmentExists(db, department))) return res.status(400).json({ error: "Invalid department" });

    const { data, error } = await db
      .from("inventory_items")
      .insert({
        department,
        name,
        quantity: itemQuantity,
        condition,
        acquisition_date: acquisition_date || null,
        comments,
        image_url,
        video_url,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error && isDepartmentConstraintError(error)) {
      const localItem = createLocalItem(req, {
        department,
        name,
        quantity: itemQuantity,
        condition,
        acquisition_date,
        comments,
        image_url,
        video_url
      });
      await writeFallbackItems([localItem, ...(await readFallbackItems())]);
      return res.status(201).json(localItem);
    }
    if (error) throw error;
    await logInventoryActivity(db, req, "added", data);
    res.status(201).json(data);
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const updateItem = async (req, res) => {
  const { id, name, quantity, condition, acquisition_date, comments, image_url, video_url } = req.body;
  const itemId = req.params.id || id;
  const itemQuantity = Number(quantity);
  if (!itemId || itemId === "undefined" || itemId === "null") return res.status(400).json({ error: "Equipment item id is required" });
  if (!name) return res.status(400).json({ error: "Item name is required" });
  if (!Number.isInteger(itemQuantity) || itemQuantity < 1) return res.status(400).json({ error: "Quantity must be at least 1" });
  if (!conditions.includes(condition)) return res.status(400).json({ error: "Invalid condition" });
  if (!isValidDateValue(acquisition_date)) return res.status(400).json({ error: "Invalid acquisition date" });

  try {
    const localItem = await findFallbackItem(itemId);
    if (localItem) {
      const localItems = await readFallbackItems();
      const updatedItem = {
        ...localItem,
        name,
        quantity: itemQuantity,
        condition,
        acquisition_date: acquisition_date || null,
        comments,
        image_url,
        video_url
      };
      await writeFallbackItems(localItems.map((item) => (
        String(item.id) === String(itemId) ? updatedItem : item
      )));
      return res.json(updatedItem);
    }

    if (!isNumericItemId(itemId)) {
      return res.status(404).json({ error: `Equipment item ${itemId} was not found` });
    }

    const db = supabase.forRequest(req);
    const { data: existingItem, error: lookupError } = await db
      .from("inventory_items")
      .select("id")
      .eq("id", itemId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existingItem) {
      return res.status(404).json({ error: `Equipment item ${itemId} was not found` });
    }

    const { data, error } = await db
      .from("inventory_items")
      .update({
        name,
        quantity: itemQuantity,
        condition,
        acquisition_date: acquisition_date || null,
        comments,
        image_url,
        video_url
      })
      .eq("id", itemId)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({
        error: "Equipment item was not updated. Confirm the item still exists and your Supabase update policy allows updates."
      });
    }

    await logInventoryActivity(db, req, "edited", data);
    res.json(data);
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const deleteItem = async (req, res) => {
  try {
    const localItem = await findFallbackItem(req.params.id);
    if (localItem) {
      const localItems = await readFallbackItems();
      await writeFallbackItems(localItems.filter((item) => String(item.id) !== String(req.params.id)));
      return res.json({ success: true, message: "Item deleted" });
    }

    if (!isNumericItemId(req.params.id)) {
      return res.status(404).json({ error: "Equipment item was not found" });
    }

    const db = supabase.forRequest(req);
    const { data: existingItem, error: lookupError } = await db
      .from("inventory_items")
      .select(itemSnapshotFields)
      .eq("id", req.params.id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existingItem) {
      return res.status(404).json({ error: "Equipment item was not found" });
    }

    const { error } = await db.from("inventory_items").delete().eq("id", req.params.id);
    if (error) throw error;

    await logInventoryActivity(db, req, "deleted", existingItem);

    res.json({ success: true, message: "Item deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const folder = req.body.folder || "items";
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${folder}/${Date.now()}-${safeName}`;

    const db = supabase.forRequest(req);
    const { error } = await db.storage.from("inventory").upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });

    if (error) throw error;

    const { data } = db.storage.from("inventory").getPublicUrl(filePath);
    res.status(201).json({ url: data.publicUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getApiInfo,
  getDashboard,
  getReport,
  getActivity,
  getMedia,
  listDepartments,
  createDepartment,
  deleteDepartment,
  getDepartmentItems,
  createItem,
  updateItem,
  deleteItem,
  uploadFile
};
