import { Composition } from 'remotion';
import { Treedesfera3D } from './Treedesfera3D';

export const RemotionRoot = () => {
  return (
    <Composition
      id="treedesfera-3d"
      component={Treedesfera3D}
      durationInFrames={252}
      fps={30}
      width={1080}
      height={1080}
    />
  );
};
