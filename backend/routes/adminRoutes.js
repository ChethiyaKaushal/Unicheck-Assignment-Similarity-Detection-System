const express = require("express");
const auth = require("../middleware/authMiddleware");
const roles = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const admin = require("../controllers/adminController");
const { uploadQuestionPaper } = require("../controllers/uploadController");

const router = express.Router();
router.use(auth, roles("admin"), (req, res, next) => req.user.mustChangePassword
    ? res.status(403).json({ message: "Please change your password before continuing." })
    : next());

router.get("/overview", admin.overview);
router.get("/activity", admin.listActivity);
router.get("/users", admin.listUsers);
router.post("/users", admin.createUser);
router.patch("/users/:userId", admin.updateUser);
router.post("/users/:userId/reset-password", admin.resetPassword);
router.delete("/users/:userId", admin.deleteUser);
router.get("/modules", admin.listModules);
router.post("/modules", admin.createModule);
router.patch("/modules/:moduleId", admin.updateModule);
router.patch("/modules/:moduleId/archive", admin.setModuleArchived);
router.get("/assignments", admin.listAssignments);
router.post("/assignments", upload.single("pdf"), uploadQuestionPaper);
router.patch("/assignments/:assignmentId/archive", admin.setAssignmentArchived);

module.exports = router;
