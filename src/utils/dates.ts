export const getHHMMSS = (timestamp: number) =>
  new Date(timestamp).toTimeString().split(" ")[0];
