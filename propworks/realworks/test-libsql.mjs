import { createClient } from '@libsql/client'

try {
  createClient({ url: 'file:./dev.db' })
  console.log("file:./dev.db works")
} catch (e) {
  console.log("file:./dev.db failed", e.message)
}

try {
  createClient({ url: 'file:dev.db' })
  console.log("file:dev.db works")
} catch (e) {
  console.log("file:dev.db failed", e.message)
}
