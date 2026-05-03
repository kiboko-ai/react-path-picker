import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { PickerDemo } from './PickerDemo';

const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="PickerDemo"
      component={PickerDemo}
      durationInFrames={360}
      fps={30}
      width={1280}
      height={720}
    />
  </>
);

registerRoot(RemotionRoot);
