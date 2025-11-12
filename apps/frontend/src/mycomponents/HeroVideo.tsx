import React from "react";

const HeroVideo = () => {
  return (
    <div className="flex justify-center">
      <video
        src="https://res.cloudinary.com/zapier-media/video/upload/q_auto:best,f_auto/v1745864783/aiworkflowshomepage.mp4"
        className="max-w-3xl"
        controls={false}
        autoPlay
        muted
      ></video>
    </div>
  );
};

export default HeroVideo;