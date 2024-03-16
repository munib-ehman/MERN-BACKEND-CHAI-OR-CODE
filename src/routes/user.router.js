import Router from "express";
import { changePassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetail, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
    );
router.route('/login').post(loginUser)
// secured routes
router.route('/logout').post(verifyJWT,logoutUser)
router.route('/refresh-token').post(verifyJWT,refreshAccessToken);
router.route('/change-password').post(verifyJWT,changePassword);
router.route('/current-user').get(verifyJWT,getCurrentUser);
router.route("/update-account").patch(verifyJWT,updateAccountDetail)
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/update-cover").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
router.route('/channel/:username').get(verifyJWT,getUserChannelProfile);
router.route('/watch-history').get(verifyJWT,getWatchHistory);
export default router;
