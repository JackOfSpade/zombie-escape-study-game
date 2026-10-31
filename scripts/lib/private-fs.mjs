export function assertOwnerOnly(stat, options = {}) {
  const {
    kind,
    maxBytes,
    message = "Unsafe file or directory permissions",
  } = options;
  if (
    stat.isSymbolicLink() ||
    (kind === "file" && !stat.isFile()) ||
    (kind === "directory" && !stat.isDirectory()) ||
    (typeof process.getuid === "function" && stat.uid !== process.getuid()) ||
    (stat.mode & 0o077) !== 0 ||
    (maxBytes !== undefined && stat.size > maxBytes)
  ) {
    throw Error(message);
  }
}
