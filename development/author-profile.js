// Author credits in this fork can link to their actual Scratch or GitHub profile.
// Keep attribution links distinct from arbitrary pages, repositories or scripts.
export const isAuthorProfile = (link) =>
  typeof link === "string" &&
  (/^https:\/\/scratch\.mit\.edu\/users\/[A-Za-z0-9_-]+\/?$/.test(link) ||
    /^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]{0,38}\/?$/.test(link));
