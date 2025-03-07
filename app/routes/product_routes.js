// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for examplesƒ
const Product = require('../models/product')
const Favorite = require('../models/favorite')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /examples
router.get('/products', (req, res, next) => {
	Product.find()
		.then((products) => {
			// `examples` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return products.map((product) => product.toObject())
		})
		// respond with status 200 and JSON of the examples
		.then((products) => res.status(200).json({ products: products }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// INDEX
// get products by category
router.get('/products/category/:category', (req, res, next) => {
	const category = req.params.category
	Product.find({category:category})
		.then((products) => {
			// `examples` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return products.map((product) => product.toObject())
		})
		// respond with status 200 and JSON of the examples
		.then((products) => res.status(200).json({ products: products }))
		// if an error occurs, pass it to the handler
		.catch(next)
})


// SHOW
// GET /examples/5a7db6c74d55bc51bdf39793
router.get('/products/:id', (req, res, next) => {
	// req.params.id will be set based on the `:id` in the route
	Product.findById(req.params.id)
		.populate('owner')
		.then(handle404)
		// if `findById` is succesful, respond with 200 and "example" JSON
		.then((product) => res.status(200).json({ product: product.toObject() }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// CREATE
// POST /examples
router.post('/products', requireToken, (req, res, next) => {
	// set owner of new example to be current user
	req.body.product.owner = req.user.id

	Product.create(req.body.product)
		// respond to succesful `create` with status 201 and JSON of new "example"
		.then((product) => {
			res.status(201).json({ product: product.toObject() })
		})
		// if an error occurs, pass it off to our error handler
		// the error handler needs the error message and the `res` object so that it
		// can send an error message back to the client
		.catch(next)
})

// UPDATE
// PATCH /examples/5a7db6c74d55bc51bdf39793
router.patch('/products/:id', requireToken, removeBlanks, (req, res, next) => {
	// if the client attempts to change the `owner` property by including a new
	// owner, prevent that by deleting that key/value pair
	delete req.body.product.owner

	Product.findById(req.params.id)
		.then(handle404)
		.then((product) => {
			// pass the `req` object and the Mongoose record to `requireOwnership`
			// it will throw an error if the current user isn't the owner
			requireOwnership(req, product)

			// pass the result of Mongoose's `.update` to the next `.then`
			return product.updateOne(req.body.product)
		})
		// if that succeeded, return 204 and no JSON
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// DESTROY
// DELETE /examples/5a7db6c74d55bc51bdf39793
router.delete('/products/:id', requireToken, (req, res, next) => {
	Product.findById(req.params.id)
		.then(handle404)
		.then((product) => {
			// throw an error if current user doesn't own `example`
			requireOwnership(req, product)
			// delete the example ONLY IF the above didn't throw
			product.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// *******************************************
//  Favorites Routes
// *******************************************



router.get('/favorites', (req, res, next) => {
	Favorite.find({})
		.populate('product')
		.populate('owner')
		.then((favorites) => {
			// `examples` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return favorites.map((favorite) => favorite.toObject())
		})
		// respond with status 200 and JSON of the examples
		.then((favorites) => res.status(200).json({ favorites: favorites }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

router.post('/favorites', requireToken, (req, res, next) => {
	// set owner of new example to be current user
	req.body.favorite.owner = req.user.id


	Favorite.create(req.body.favorite)
		// respond to succesful `create` with status 201 and JSON of new "example"
		.then((favorite) => {
			res.status(201).json({ favorite: favorite.toObject() })
		})
		// if an error occurs, pass it off to our error handler
		// the error handler needs the error message and the `res` object so that it
		// can send an error message back to the client
		.catch(next)
})


router.delete('/favorites/:id', requireToken, (req, res, next) => {
	Favorite.findById(req.params.id)
		.then(handle404)
		.then((favorite) => {
			// throw an error if current user doesn't own `example`
			requireOwnership(req, favorite)
			// delete the example ONLY IF the above didn't throw
			favorite.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})



module.exports = router
