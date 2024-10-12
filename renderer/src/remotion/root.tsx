import { Composition } from "remotion";
import { RemotionVideo } from "./composition";

export function RemotionRoot() {
  return (
    <Composition
      id="MyComposition"
      component={RemotionVideo}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
