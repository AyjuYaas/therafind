import cloudinary from "../config/cloudinary.js";
import Document from "../models/document.model.js";
import Match from "../models/match.model.js";
import Message from "../models/message.model.js";
import Review from "../models/review.model.js";
import Therapist from "../models/therapist.model.js";
import User from "../models/user.model.js";
import axios from "axios";
import { validate } from "email-validator";
import Preference from "../models/userPreferences.model.js";

export const updateDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        image: user.image,
        name: user.name,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate,
        gender: user.gender,
      },
    });
  } catch (error) {
    console.log(`Error in update user details: ${error}`);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    // ============== Get the Updated Data ==============
    const { image, ...otherFields } = req.body;
    const updatedData = otherFields;

    // ============== Upload image to cloudinary ==============
    if (image) {
      // base64 format
      if (image.startsWith("data:image")) {
        try {
          // Incase it is their first upload
          if (!req.user.imagePublicId) {
            const uploadResponse = await cloudinary.uploader.upload(image, {
              folder: "TheraFind/UserProfilePictures",
              crop: "auto",
              width: 500,
              height: 500,
              gravity: "auto",
            });
            updatedData.image = uploadResponse.secure_url;
            updatedData.imagePublicId = uploadResponse.public_id;
          } else {
            // incase they are changing their image, replace the one on cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image, {
              public_id: req.user.imagePublicId,
              crop: "auto",
              width: 500,
              height: 500,
              gravity: "auto",
            });
            updatedData.image = uploadResponse.secure_url;
          }
        } catch (err) {
          console.log(err);
          return res.status(400).json({
            success: false,
            message: "Error uploading image. Profile cannot be updated!",
          });
        }
      }
    }

    // ========== Email Validation ============
    if (!validate(updatedData.email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email Address",
      });
    }

    const nameRegex = /^[A-Za-z\s\-]{2,}$/;
    if (!nameRegex.test(updatedData.name)) {
      return res.status(400).json({
        success: false,
        message:
          "Name must be at least 2 characters long and contain only letters, spaces, or hyphens",
      });
    }

    // ============== Check if the phone-number is 10 digits ============
    if (updatedData.phone.length !== 10 || !/^\d+$/.test(updatedData.phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number should be 10 digits",
      });
    }

    // ============== Validate Date of Birth (DOB) =================
    const dob = new Date(updatedData.birthDate); // Parse the birthDate string into a Date object
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear(); // Calculate age based on the year difference

    // Adjust age if the user hasn't had their birthday yet this year
    const hasHadBirthdayThisYear =
      today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

    if (age < 10 || (age === 10 && !hasHadBirthdayThisYear)) {
      return res.status(400).json({
        success: false,
        message: "Age must be at least 10 years old",
      });
    }

    // ============== Find and update the user with their details ============
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updatedData,
      { new: true }
    );

    res.status(200).json({
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        age: updatedUser.age,
        gender: updatedUser.gender,
        image: updatedUser.image,
        problemText: updatedUser.problemText,
        problems: updatedUser.problems,
      },
    });
  } catch (err) {
    console.log(`Error in update user profile: ${err}`);
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
};

export const getPreference = async (req, res) => {
  try {
    const preference = await Preference.findOne({ user: req.user._id });

    if (!preference) {
      return res.status(404).json({
        success: false,
        message: "No preference found",
      });
    }

    res.status(200).json({
      success: true,
      preference,
    });
  } catch (error) {
    console.log(`Error in getPreference of user: ${error}`);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

async function waitForServer(url, data, maxWait = 60000, interval = 3000) {
  const startTime = Date.now();

  while (true) {
    try {
      const response = await axios.post(url, data);
      return response.data; // Server is awake, return data
    } catch (err) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWait) {
        throw new Error("Server did not wake up in time");
      }
      console.log("Server sleeping, waiting...");
      await new Promise((res) => setTimeout(res, interval));
    }
  }
}

export const problem = async (req, res) => {
  const { problemText, preferredGender, preferredLanguage } = req.body;

  // ====== If no problem, return false ============
  if (!problemText) {
    return res.status(400).json({
      success: false,
      message: "All Fields are required.",
    });
  }

  // ======= Trim the text from any line breaks at the end ============
  const problemTrimmed = problemText.replace(/\n+$/, "");

  // ======= Counting the number of words ============
  const wordCount = problemTrimmed
    .split(/\s+/) // Split by whitespace
    .filter((word) => word.length > 0).length; // Filter out empty strings

  // ======= Work count must be 20 or higher ============
  if (wordCount < 20) {
    return res.status(400).json({
      success: false,
      message: "Problem text must be at least 20 characters long.",
    });
  }

  try {
    // ======= Get the response from the flask api ============
    const responseData = await waitForServer(process.env.FLASK_URL, {
      text: problemTrimmed,
    });

    // ======= Get the problems from response ============
    const { problems } = response.data;

    // ======= Only select values greater than ten percent ============
    const filteredProblems = problems
      .filter((problem) => problem.score > 0.1) // Keep only scores > 0.1
      .map(({ problem, score }) => ({ problem, score })); // Map to the desired format

    const preferenceData = {
      user: req.user._id,
      problemText: problemTrimmed,
      predictedProblems: filteredProblems,
      preferredGender: preferredGender || "Any",
      preferredLanguage: preferredLanguage || "English",
    };

    // ======= update the user's problem text and problems ============
    const updatedPreference = await Preference.findOneAndUpdate(
      { user: req.user._id },
      { ...preferenceData },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      preference: preferenceData,
    });
  } catch (error) {
    console.log(`Error in problem of user: ${error}`);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const reviewTherapist = async (req, res) => {
  try {
    const { rating, reviewText, therapistId } = req.body;
    const userId = req.user._id;
    const userType = req.role;

    // Check if the user is authorized to review
    if (userType !== "user") {
      return res.status(400).json({
        success: false,
        message: "Not Authorized for Reviewing",
      });
    }

    // Check if the user is matched with the therapist
    const match = await Match.findOne({
      user: userId,
      therapist: therapistId,
      status: "Accept",
    });

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Not matched with the Therapist",
      });
    }

    // Find the therapist
    const therapist = await Therapist.findById(therapistId);

    if (!therapist) {
      return res.status(400).json({
        success: false,
        message: "Therapist Not Found",
      });
    }

    // Check if the user has already reviewed the therapist
    const existingReview = await Review.findOne({
      user: userId,
      therapist: therapistId,
    });

    if (existingReview) {
      // Update the existing review
      const previousRating = existingReview.rating;

      // Update the therapist's average rating
      const totalReviews = therapist.reviewCount;
      const newAverageRating =
        (therapist.rating * totalReviews - previousRating + rating) /
        totalReviews;

      therapist.rating = newAverageRating;
      existingReview.rating = rating;
      existingReview.reviewText = reviewText;

      await existingReview.save();
    } else {
      // Create a new review
      const totalReviews = therapist.reviewCount;

      // Calculate the new average rating
      const newAverageRating =
        (therapist.rating * totalReviews + rating) / (totalReviews + 1);

      therapist.rating = newAverageRating;
      therapist.reviewCount += 1;

      const review = {
        user: userId,
        therapist: therapistId,
        rating: rating,
        reviewText: reviewText,
      };

      await Review.create(review);
    }

    // Save the updated therapist data
    await therapist.save();

    return res.status(200).json({
      success: true,
      message: existingReview
        ? "Review Updated Successfully"
        : "Therapist Rated Successfully",
    });
  } catch (error) {
    console.error("Error at Review Therapist: " + error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getExistingReview = async (req, res) => {
  try {
    const { therapistId } = req.params;

    const existingReview = await Review.findOne({
      user: req.user._id,
      therapist: therapistId,
    });

    if (existingReview) {
      res.status(200).json({
        success: true,
        rating: existingReview.rating,
        reviewText: existingReview.reviewText,
      });
    }
  } catch (error) {
    console.error("Error at Get Existing Review:  " + error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Function to extract the public ID from the URL
function extractPublicIdFromUrl(url) {
  // Regex to match the public ID, handling multiple image formats (jpg, png, jpeg, etc.)
  const regex =
    /\/image\/upload\/(?:v\d+\/)?(.*?)\.(jpg|png|jpeg|gif|bmp|webp)$/i;
  const match = url.match(regex);

  if (match && match[1]) {
    return match[1]; // This gives you 'ChatImages/ysfrd3g7thtldtfagub5'
  }

  return null; // If no match is found, return null
}

export async function removeTherapist(req, res) {
  const { therapistId } = req.params;

  if (req.role === "user") {
    try {
      // Find the current user and the therapist to be removed
      const currentUser = await User.findById(req.user._id);
      const therapistToBeRemoved = await Therapist.findById(therapistId);

      if (!therapistToBeRemoved) {
        return res
          .status(404)
          .json({ success: false, message: "Therapist not found" });
      }

      const userTherapistMatch = await Match.find({
        user: currentUser._id,
        therapist: therapistToBeRemoved._id,
        status: "Accept",
      });

      // Check if the therapist is in the user's selected_therapists list using .includes()
      if (userTherapistMatch === 0) {
        return res.status(400).json({
          success: false,
          message: "Therapist is not connected with the user",
        });
      }

      // Find all messages related to the therapist
      const messages = await Message.find({
        $or: [
          { sender: therapistId, receiver: req.user._id },
          { receiver: therapistId, sender: req.user._id },
        ],
      });

      // Extract public IDs of images from the messages
      const publicIds = messages
        .filter((message) => message.image) // Only include messages with an image
        .map((message) => extractPublicIdFromUrl(message.image))
        .filter((publicId) => publicId); // Remove null/undefined public IDs

      // If there are images, delete them from Cloudinary in batch
      if (publicIds.length > 0) {
        await cloudinary.api.delete_resources(publicIds);
      }

      // Delete all messages related to the therapist in a single batch
      await Message.deleteMany({
        $or: [
          { sender: therapistId, receiver: req.user._id },
          { receiver: therapistId, sender: req.user._id },
        ],
      });

      const documents = await Document.find({
        $or: [
          { sender: therapistId, receiver: req.user._id },
          { receiver: therapistId, sender: req.user._id },
        ],
      });

      if (documents.length > 0) {
        const publicIdsDocument = documents
          .filter((doc) => doc.publicId)
          .map((doc) => doc.publicId);

        await cloudinary.api.delete_resources(publicIdsDocument, {
          resource_type: "raw",
        });

        await Document.deleteMany({
          $or: [
            { sender: therapistId, receiver: req.user._id },
            { receiver: therapistId, sender: req.user._id },
          ],
        });
      }

      await Match.deleteMany({
        user: currentUser._id,
        therapist: therapistToBeRemoved._id,
        status: "Accept",
      });

      // Return success message
      return res.status(200).json({
        success: true,
        message: "Therapist removed successfully",
      });
    } catch (error) {
      console.error(
        "Error removing therapist and deleting images/messages:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          "An error occurred while removing the therapist and deleting images/messages",
      });
    }
  } else {
    return res.status(403).json({
      success: false,
      message: "Forbidden: You do not have permission to perform this action",
    });
  }
}

export async function removeRequest(req, res) {
  try {
    const { requestId } = req.body;

    if (req.role !== "user") {
      return res.status(400).json({
        success: false,
        message: "Therapist cannot delete the Request",
      });
    }

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "No request Id provided",
      });
    }

    const request = await Match.findById(requestId);

    if (!request) {
      return res.status(400).json({
        success: false,
        message: "No request found",
      });
    }

    if (!request.user.equals(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "Not authorized to delete this request",
      });
    }

    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Request Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
