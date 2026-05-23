const supabase = require("../config/supabase");

const departments = [
  "computing",
  "nursing",
  "accounting",
  "public-health",
  "mass-communication",
  "bio-chemistry",
  "biological-science"
];

const conditions = ["good", "outdated", "for_repair", "for_replacement", "missing"];

const handleInventoryError = (res, error) => {
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

    const departmentTotals = departments.reduce((totals, department) => {
      totals[department] = 0;
      return totals;
    }, {});

    const counts = {
      total: items.length,
      departments: departments.length,
      departmentTotals,
      good: 0,
      outdated: 0,
      repair: 0,
      replacement: 0,
      missing: 0
    };

    counts.total = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

    items.forEach((item) => {
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
    const { data: items, error } = await db
      .from("inventory_items")
      .select("id, department, name, quantity, condition, acquisition_date, comments, created_at")
      .order("department", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

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
      department,
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

    if (!error) return res.json(normalizeActivityRows(data));
    if (!isMissingActivityTableError(error)) throw error;

    const { data: items, error: itemsError } = await db
      .from("inventory_items")
      .select(itemSnapshotFields)
      .order("created_at", { ascending: false })
      .limit(50);

    if (itemsError) throw itemsError;
    res.json(items.map((item) => buildActivityRecord("added", item, item.created_at, item.created_by)));
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
    res.json(data);
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const getDepartmentItems = async (req, res) => {
  const department = req.params.dept;
  if (!departments.includes(department)) {
    return res.status(404).json({ error: "Department not found" });
  }

  try {
    const db = supabase.forRequest(req);
    const { data, error } = await db
      .from("inventory_items")
      .select("*")
      .eq("department", department)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    handleInventoryError(res, error);
  }
};

const createItem = async (req, res) => {
  const { department, name, quantity, condition, acquisition_date, comments, image_url, video_url } = req.body;
  const itemQuantity = Number(quantity);
  if (!departments.includes(department)) return res.status(400).json({ error: "Invalid department" });
  if (!name) return res.status(400).json({ error: "Item name is required" });
  if (!Number.isInteger(itemQuantity) || itemQuantity < 1) return res.status(400).json({ error: "Quantity must be at least 1" });
  if (!conditions.includes(condition)) return res.status(400).json({ error: "Invalid condition" });
  if (!isValidDateValue(acquisition_date)) return res.status(400).json({ error: "Invalid acquisition date" });

  try {
    const db = supabase.forRequest(req);
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
    const db = supabase.forRequest(req);
    const { data: existingItem, error: lookupError } = await db
      .from("inventory_items")
      .select(itemSnapshotFields)
      .eq("id", req.params.id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existingItem) return res.status(404).json({ error: "Equipment item was not found" });

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

    const { error } = await supabase.storage.from("inventory").upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });

    if (error) throw error;

    const { data } = supabase.storage.from("inventory").getPublicUrl(filePath);
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
  getDepartmentItems,
  createItem,
  updateItem,
  deleteItem,
  uploadFile
};
