import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { posts, users } from './db/schema'

type Bindings = {
  third_api_db: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

async function hashPassword(password: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

app.get('/', (c) => {
  return c.text('API funcionando')
})

app.post('/register', async (c) => {
  const db = drizzle(c.env.third_api_db)
  const { name, email, password } = await c.req.json()

  if (!name || !email || !password) {
    return c.json({ error: 'Faltan campos obligatorios' }, 400)
  }

  try {
    const hashedPassword = await hashPassword(password)

    await db.insert(users).values({
      id: crypto.randomUUID(),
      name,
      email,
      password: hashedPassword
    })

    return c.json({ message: 'Usuario creado' }, 201)
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Email ya registrado' }, 409)
    }

    return c.json({ error: 'Error interno' }, 500)
  }
})

app.get('/users', async (c) => {
  const db = drizzle(c.env.third_api_db)

  try {
    // Seleccionamos todos los usuarios de la tabla
    const allUsers = await db.select().from(users).all()
    return c.json(allUsers)
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error(e.message)
    }
    return c.json({ error: 'No se pudieron obtener los usuarios' }, 500)
  }
})

app.post('/posts', async (c) => {
  // Aquí iría la lógica para crear un nuevo post
  const { title, content } = await c.req.json()

  if (!title || !content) {
    return c.json({ error: 'Faltan campos obligatorios' }, 400)
  }

  const db = drizzle(c.env.third_api_db)

  try {
    // Aquí podríamos agregar lógica para verificar la autenticidad del usuario
    const newPost = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString()
    }

    await db.insert(posts).values(newPost) // Suponiendo que tenemos una tabla 'posts' definida en nuestro esquema

    // En un caso real, guardaríamos el post en la base de datos
    return c.json({ message: 'Post creado', post: newPost }, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error(e.message)
    }
    return c.json({ error: 'Error al crear el post' }, 500)
  }

  // Simulamos la creación del post
})

export default app
