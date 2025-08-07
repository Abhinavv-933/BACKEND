const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch(next);
  };
};





export default asyncHandler



// made a wrapper functn to use evryone
/*
const asyncHandler = (fn) => async(req,res,next) => {
  try {
    await fn(req,res,next)
  } catch (error) {
    res.status(error.code || 100).json({
      success:false,   // this json helps frontend to debug 
      message: error.message
    })
  }
}
  */