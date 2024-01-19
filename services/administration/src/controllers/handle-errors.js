function handleError(res, error, details) {

  res.status(400).json({
    message : error.message,
    details : details,
    stack : error.stack
  });

}

export default handleError;