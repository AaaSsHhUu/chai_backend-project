//  ------------ Approach 1 ----------------
const asyncHandler = (fn) => async (req,res,next) => {
    try{
        await fn(req,res,next);
    }
    catch(err){
        res.status(err.code || 500).json({
            sucess : false,
            message : err.message
        })
    }
}

//  ------------ Approach 2 ----------------
// const  asyncHandler = (requestHandler) => {
//     (req,res,next) => {
//         Promise.resolve(requestHandler(req,res,next)).catch((err) => next(err))
//     }
// }

export default asyncHandler;