export function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'An account with that email already exists.' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: 'Please check the submitted information.' });
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong. Please try again.' });
}
