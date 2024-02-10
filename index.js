const axios = require('axios')
const Redis = require('redis')
const express = require('express')
const cors = require('cors')
const EXPIRATION = 3600

const redisClient = Redis.createClient().on('error', err => console.log('Redis Client Error', err))
redisClient.connect()

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(cors())

async function getOrSetCache(key, callBack) {
    try {
        const cachedValue = await redisClient.get(key)
        if (cachedValue) {
            console.log("Cache hit")
            return JSON.parse(cachedValue)
        }
        console.log("Cache miss")
        const newData = await callBack()
        redisClient.setEx(key, EXPIRATION, JSON.stringify(newData))
        return newData
    } catch (error) {
        console.error(error)
    }
}

app.get("/photos", async (req, res) => {
    const albumId = req.query.albumId
    const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
        const { data } = await axios.get(
            "https://jsonplaceholder.typicode.com/photos",
            { params: { albumId } }
        )
        return data
    })
    res.json(photos)
})

app.get("/photos/:id", async (req, res) => {
    const photo = await getOrSetCache(`photos:id=${req.params.id}`, async () => {
        const { data } = await axios.get(
            `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
        )
        return data
    })
    res.json(photo)
})

app.listen(3000)