const processedMessages = new Set();

const addMessage = (messageId) => {
  processedMessages.add(messageId);
};

const hasMessage = (messageId) => {
  return processedMessages.has(messageId);
};

// For testing purposes
const clearCache = () => {
  processedMessages.clear();
};

module.exports = {
  addMessage,
  hasMessage,
  clearCache,
};
