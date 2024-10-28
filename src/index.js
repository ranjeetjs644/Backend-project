import dotenv from 'dotenv';
import { app } from './app.js';
import connectDB from './db/database.js';

dotenv.config({ path: "../.env" })

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`server started on Port ${process.env.PORT || 8000}`)
    })
  })
  .catch((err) => {
    console.log('MongoDB Connection failed ', err)
  })

// Your other server setup and code
