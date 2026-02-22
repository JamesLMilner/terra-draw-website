export const getHHMMSS = (timestamp: number) =>
  new Date(timestamp).toTimeString().split(" ")[0];


export const formatDateTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${d.toDateString()} ${d.toTimeString().split(" ")[0]}`;
};


export const fileDate = () =>
  new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace("Z", "")
    .replace("T", "_")
    .replace(".", "_");
