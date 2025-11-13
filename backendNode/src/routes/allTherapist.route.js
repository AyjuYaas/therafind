import Therapist from "../models/therapist.model.js";
import therapistRatingandMatch from "../utils/therapistRatingandMatch.js";

export const allTherapist = async (req, res) => {
  const therapists = await Therapist.find({
    validationStatus: "approved",
    availability: true,
  })
    .select("_id name image specialization experience qualification gender")
    .limit(6)
    .lean();

  const therapistsWithStats = await Promise.all(
    therapists.map(async (therapist) => {
      const stats = await therapistRatingandMatch(therapist._id); // Reuse your utility function
      return {
        _id: therapist._id,
        name: therapist.name,
        image: therapist.image,
        experience: therapist.experience,
        rating: stats.rating,
        specialization: therapist.specialization,
        reviewCount: stats.reviewCount,
        gender: therapist.gender,
        totalMatches: stats.totalMatches,
      };
    })
  );

  therapistsWithStats.sort((a, b) => b.rating - a.rating);

  return res.status(200).json({
    success: true,
    therapist: therapistsWithStats,
  });
};
