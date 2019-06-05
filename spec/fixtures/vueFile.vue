<template>
  <div>
    <button @click="sayHello">say hello</button>
    <button @click="sayHi">say hi</button>
  </div>
</template>

<script>
  export default {
    name: "hello-world",
    method: {
      sayHello() {
        const msg1 = 'hello'
        const msg2 = 'world'
        console.log(msg1 + msg2)
      },
      sayHi() {
        const msg1 = 'hello'
        const msg2 = 'world'
        console.log(msg1 + msg2)

      }
    }
  }
</script>

<style scoped>

</style>