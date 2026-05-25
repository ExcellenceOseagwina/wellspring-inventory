const express = require("express");
const {
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
} = require("../controllers/inventoryController");
const authenticate = require("../middleware/auth");
const upload = require("../utils/upload");

const router = express.Router();

router.get("/", getApiInfo);
router.get("/dashboard", authenticate, getDashboard);
router.get("/report", authenticate, getReport);
router.get("/activity", authenticate, getActivity);
router.get("/media", authenticate, getMedia);
router.get("/departments", authenticate, listDepartments);
router.post("/departments", authenticate, createDepartment);
router.delete("/departments/:slug", authenticate, deleteDepartment);
router.get("/department/:dept", authenticate, getDepartmentItems);
router.post("/items", authenticate, createItem);
router.put("/items/:id", authenticate, updateItem);
router.delete("/items/:id", authenticate, deleteItem);
router.post("/upload", authenticate, upload.single("file"), uploadFile);

module.exports = router;
