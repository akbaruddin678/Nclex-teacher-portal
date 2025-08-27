const express = require("express");
const router = express.Router();
const {
  createLessonPlan,
  getLessonPlans,
  getLessonPlan,
  updateLessonPlan,
  deleteLessonPlan,
  duplicateLessonPlan,
  searchLessonPlans,
} = require("../controllers/lessionPlanController");
const { protect } = require("../middleware");

// All routes protected (any authenticated user can manage their own lesson plans)
router.use(protect);

router.route("/").post(createLessonPlan).get(getLessonPlans);

router.route("/search").get(searchLessonPlans);

router
  .route("/:id")
  .get(getLessonPlan)
  .put(updateLessonPlan)
  .delete(deleteLessonPlan);

router.route("/:id/duplicate").post(duplicateLessonPlan);

module.exports = router;
