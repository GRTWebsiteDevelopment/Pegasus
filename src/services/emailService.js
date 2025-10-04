const sendEmailNotification = async (recipient, subject, body) => {
  // Mock implementation for sending an email notification
  console.log(`Sending email to ${recipient} with subject "${subject}" and body "${body}"`);
  return { status: 'sent', recipient, subject };
};

module.exports = {
  sendEmailNotification,
};
