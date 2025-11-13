import cloudinary from "../config/cloudinary.js";
import Therapist from "../models/therapist.model.js";
import { validate } from "email-validator";
import User from "../models/user.model.js";
import { getConnectedUsers, getIo } from "../socket/socket.server.js";
import Match from "../models/match.model.js";
import therapistRatingandMatch from "../utils/therapistRatingandMatch.js";
import validatePassword from "../middleware/password.middle.js";

export async function updateDetails(req, res) {
  try {
    const therapist = await Therapist.findById(req.user._id);

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        name: therapist.name,
        image: therapist.image,
        availability: therapist.availability,
        email: therapist.email,
        phone: therapist.phone,
        gender: therapist.gender,
        languages: therapist.languages,
        specialization: therapist.specialization,
        experience: therapist.experience,
        qualification: therapist.qualification,
      },
    });
  } catch (error) {
    console.log(`Error in update therapist details: ${error}`);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function updateTherapist(req, res) {
  try {
    const { image, newPassword, ...otherFields } = req.body;
    const updatedData = otherFields;

    const therapist = await Therapist.findById(req.user._id);

    if (newPassword) {
      if (therapist.matchPassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: "New Password Same as Old Password",
        });
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.errors.join(", "),
        });
      }

      updatedData.newPassword = newPassword;
    }

    // Uploading image to cloudinary
    if (image) {
      // base 64 formal
      if (image.startsWith("data:image")) {
        try {
          // incase of new Image
          if (!req.user.imagePublicId) {
            const uploadResponse = await cloudinary.uploader.upload(image, {
              folder: "TheraFind/TherapistProfilePictures",
              crop: "auto",
              width: 500,
              height: 500,
              gravity: "auto",
            });
            updatedData.image = uploadResponse.secure_url;
            updatedData.imagePublicId = uploadResponse.public_id;
          } else {
            // incase of existing image, replace their image
            const uploadResponse = await cloudinary.uploader.upload(image, {
              public_id: req.user.imagePublicId,
              crop: "auto",
              width: 500,
              height: 500,
              gravity: "auto",
            });
            updatedData.image = uploadResponse.secure_url;
          }
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: "Error uploading image. Profile cannot be updated!",
          });
        }
      }
    }

    const nameRegex = /^[A-Za-z\s\-]{2,}$/;
    if (!nameRegex.test(updatedData.name)) {
      return res.status(400).json({
        success: false,
        message:
          "Name must be at least 2 characters long and contain only letters, spaces, or hyphens",
      });
    }

    // ============== Email Validation ============
    if (!validate(updatedData.email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email Address",
      });
    }

    // ============== Check if the phone-number is 10 digits ============
    if (updatedData.phone.length !== 10 || !/^\d+$/.test(updatedData.phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number should be 10 digits",
      });
    }

    if (updatedData.experience < 0 || updatedData.experience > 50) {
      return res.status(400).json({
        success: false,
        message: "Experience should be between 0 and 50 years",
      });
    }

    const updatedTherapist = await Therapist.findByIdAndUpdate(
      req.user._id,
      updatedData,
      { new: true }
    );

    const stats = await therapistRatingandMatch(req.user._id);

    res.status(200).json({
      success: true,
      user: {
        _id: updatedTherapist._id,
        name: updatedTherapist.name,
        image: updatedTherapist.image,
        rating: stats.rating,
        reviewCount: stats.reviewCount,
      },
    });
  } catch (error) {
    console.log(`Error in Therapist profile update: ${error}`);
    if (err.name === "MongoServerError" && err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${
          field === "email" ? "Email" : "Phone number"
        } is already registered`,
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export async function respondRequest(req, res) {
  // ======= Get the request Id and response of the therapist =========
  const { requestId, response } = req.body;
  const therapistId = req.user._id;

  try {
    // ======= Find the request from db ========
    const requestByUser = await Match.findById(requestId);

    // ======= If there is no response ======
    if (!requestByUser) {
      return res.status(400).json({
        success: false,
        message: "Request not found.",
      });
    }

    // ======= If the request was not sent by the associated therapist
    if (!requestByUser.therapist.equals(therapistId)) {
      return res.status(400).json({
        success: false,
        message: "You are not authorized to respond to this request.",
      });
    }

    // ======= If nothing find the therapist and the user
    const therapist = await Therapist.findById(therapistId);
    const user = await User.findById(requestByUser.user);

    // ======= If either therapist or use does not exist
    if (!user || !therapist) {
      return res.status(400).json({
        success: false,
        message: "User or Therapist not found.",
      });
    }

    const existingRequest = await Match.find({
      user: user._id,
      therapist: therapist._id,
      status: "Accept",
    });

    // ======= If therapist is already matched with the user
    if (existingRequest.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Request already responded to",
      });
    }

    // ====================================================
    // ======= Use Socket IO to send the notification
    const connectedUsers = getConnectedUsers();
    const io = getIo();
    // ======= Check the connection id of the sending user ==========
    const requestingUserSocketId = connectedUsers.get(user._id.toString());
    // ====================================================

    // ======= If therapist accepts the request ==========
    if (response === "accept") {
      // ======= Change the status of request to Accept
      requestByUser.status = "Accept";

      // ======= Save the changes in the database
      await requestByUser.save();

      await Therapist.findByIdAndUpdate(therapistId, {
        $inc: { totalMatches: 1 },
      });

      // ====================================================
      // ======= Send the response to the User about the status
      if (requestingUserSocketId) {
        io.to(requestingUserSocketId).emit("requestResponse", {
          success: true,
          name: therapist.name,
        });
      }
      // ====================================================

      return res.status(200).json({
        success: true,
        message: "Request Accepted Successfully",
      });
    }

    // If therapist rejected the request
    if (response === "reject") {
      // ======= Set the status to decline ===========
      requestByUser.status = "Declined";

      // ======= Save the changes to db ===========
      await requestByUser.save();

      // ====================================================
      // ======= Send the response to the User about the status
      if (requestingUserSocketId) {
        io.to(requestingUserSocketId).emit("requestResponse", {
          success: false,
          name: therapist.name,
        });
      }
      // ====================================================

      return res.status(200).json({
        success: true,
        message: "Request Rejected",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid response provided.",
    });
  } catch (error) {
    console.log("Error at RequestRespond " + error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
