import { JSX } from "react";
import StarRating from "./StarRating";
import { matchedTherapists } from "../types/match.types";

interface IndividualTherapist {
  therapist: matchedTherapists;
}

const IndividualTherapist = ({
  therapist,
}: IndividualTherapist): JSX.Element => {
  return (
    <section className="w-60 h-125 sm:w-80 lg:h-140 flex flex-col hover:shadow-2xl rounded-4xl shadow-2xs cursor-pointer text-xl overflow-hidden hover:-translate-y-1 transition-all duration-250 ease-in-out">
      <div className="flex flex-col rounded-2xl h-full">
        <div className=" bg-[#1d2b36] p-10 flex flex-col justify-between items-center gap-1 w-full">
          {/* Image of Therapist */}
          <img
            src={therapist.image}
            alt={`${therapist.name}-profile`}
            className="h-20 rounded-full lg:h-31 3xl:h-40 border-3"
          />

          {/* Name and Rating of Therapist */}
          <div className="flex flex-col justify-center items-center gap-2">
            <h1 className="font-extrabold w-full text-[white] text-center text-xl md:text-2xl">
              {`${therapist.name.split(" ").slice(0, 1)} 
                ${therapist.name.split(" ").slice(1, 2)}`}{" "}
              ({therapist.gender[0]})
            </h1>
            <div className="flex gap-1 items-center">
              <StarRating rating={therapist.rating} color="text-yellow-300" />
              <span className="text-white">({therapist.reviewCount})</span>
            </div>
            <div className="text-white text-base">
              <p>
                <span className="font-bold">Total Matches: </span>
                {therapist.totalMatches}
              </p>
            </div>
            {therapist.score && (
              <div className="text-base text-green-500">
                <p>
                  <span className="font-bold">score: </span>
                  {therapist.score.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#f0f8ff] w-full h-full flex flex-col justify-center gap-5 px-2 py-2 items-center">
          {/* Experience  */}
          <p className="flex flex-col items-center font-bold">
            <span className="text-[#00927f] text-lg sm:text-xl xl:text-2xl">
              Experience
            </span>
            <span className="font-medium text-xl md:text-2xl text-main-text">
              {therapist.experience} years
            </span>
          </p>

          {/* Specialization  */}
          <div className="flex flex-col items-center font-bold">
            <span className="text-[#00927f] text-lg sm:text-xl xl:text-2xl">
              Specialization
            </span>{" "}
            <ul className="flex flex-col justify-center items-center font-extrabold text-lg md:text-xl text-main-text">
              {therapist.specialization
                .slice(0, 2)
                .map((content: string, index: number) => (
                  <li key={index} className="text-center font-medium">
                    {content}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
export default IndividualTherapist;
