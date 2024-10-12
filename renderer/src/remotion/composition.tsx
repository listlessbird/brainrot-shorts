import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Img,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { z } from "zod";

import { CaptionSchema } from "../schema";
import { defaultProps } from "./default";

type VideoComponentProps = {
  topic: string;
  script: { textContent: string; imagePrompt: string }[];
  images: string[];
  speechUrl: string;
  captions: z.infer<typeof CaptionSchema>[];
};

export const VideoComponent: React.FC<VideoComponentProps> = ({
  topic,
  script,
  images,
  speechUrl,
  captions,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const getCurrentCaption = (frame: number) => {
    const timeInMs = (frame / fps) * 1000;
    return (
      captions.find(
        (caption) => timeInMs >= caption.start && timeInMs <= caption.end
      ) || null
    );
  };

  const getCurrentScriptIndex = (frame: number) => {
    const timeInMs = (frame / fps) * 1000;
    const totalDuration = captions[captions.length - 1].end;
    return Math.floor((timeInMs / totalDuration) * script.length);
  };

  const currentCaption = getCurrentCaption(frame);
  const currentScriptIndex = getCurrentScriptIndex(frame);
  const currentImage = images[currentScriptIndex];

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <Audio src={speechUrl} />

      <Sequence from={0} durationInFrames={90}>
        <h1
          style={{
            fontSize: 60,
            textAlign: "center",
            position: "absolute",
            top: "40%",
            width: "100%",
            color: "black",
          }}
        >
          {topic}
        </h1>
      </Sequence>

      <Img
        src={currentImage}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 50,
          right: 50,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: 20,
          borderRadius: 10,
        }}
      >
        <p style={{ color: "white", fontSize: 24, margin: 0 }}>
          {script[currentScriptIndex].textContent}
        </p>
      </div>

      {currentCaption && (
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 0,
            right: 0,
            textAlign: "center",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            padding: 10,
          }}
        >
          <p style={{ color: "white", fontSize: 24, margin: 0 }}>
            {currentCaption.text}
          </p>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="VideoGeneration"
      component={VideoComponent}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
      calculateMetadata={async ({ props }) => {
        const durationInSeconds =
          props.captions[props.captions.length - 1].end / 1000;

        return {
          durationInFrames: Math.floor(durationInSeconds * 30),
        };
      }}
    />
  );
};
