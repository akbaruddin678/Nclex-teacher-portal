const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware");
const {
  createCampus,
  getCampuses,
  updateCampus,
  deleteCampus,
} = require("../controllers/campusController");

router.use(protect);
router.use(authorize("admin"));

router.route("/").post(createCampus).get(getCampuses);

router.route("/:id").put(updateCampus).delete(deleteCampus);

module.exports = router;
