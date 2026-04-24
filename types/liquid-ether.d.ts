declare module "@/components/LiquidEther.jsx" {
  import type * as React from "react";

  type LiquidEtherProps = {
    mouseForce?: number;
    cursorSize?: number;
    isViscous?: boolean;
    viscous?: number;
    iterationsViscous?: number;
    iterationsPoisson?: number;
    dt?: number;
    BFECC?: boolean;
    resolution?: number;
    isBounce?: boolean;
    colors?: string[];
    style?: React.CSSProperties;
    className?: string;
    autoDemo?: boolean;
    autoSpeed?: number;
    autoIntensity?: number;
    takeoverDuration?: number;
    autoResumeDelay?: number;
    autoRampDuration?: number;
  };

  const LiquidEther: React.ComponentType<LiquidEtherProps>;
  export default LiquidEther;
}

