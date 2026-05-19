// 触控控制的共享状态。
// TouchControls 写入，InputBuffer 读取。
// 单例够用 —— 这游戏全局只有一个玩家。

export interface TouchState {
  enabled: boolean;
  left: boolean;
  right: boolean;
  down: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;        // 脉冲，被 InputBuffer 消费后清零
  dashPressed: boolean;
  bashPressed: boolean;
}

export const touchState: TouchState = {
  enabled: false,
  left: false,
  right: false,
  down: false,
  jumpHeld: false,
  jumpPressed: false,
  dashPressed: false,
  bashPressed: false,
};

export function hasTouch(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
  );
}
