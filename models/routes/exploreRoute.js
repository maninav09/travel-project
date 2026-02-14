const express = require("express");
const router = express.Router();
const controller = require("../../controller/controller"); 

router.get("/hotels", controller.getHotels);
router.get("/famous", controller.getFamousPlaces);
router.get("/hidden-gems", controller.getHiddenGems);
router.get("/food-corners", controller.getFoodCorners);
router.get("/food-corner", controller.getFoodCorners);
router.get("/foodcorners", controller.getFoodCorners);

module.exports = router;
