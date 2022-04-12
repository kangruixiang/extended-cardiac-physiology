<script>
  import { createEventDispatcher } from "svelte";
  export let data;
  export let min = 0;
  export let max = 1000;

  const dispatch = createEventDispatcher();

  function sendData() {
    dispatch("eq");
  }
</script>

<div class="flex justify-between w-full">
  <div on:click={sendData} class="cursor-pointer hover:underline">
    <slot />&nbsp;
  </div>

  <div
    class="font-semibold text-right"
    class:warning={data < min || data > max}
  >
    {Math.round(data * 10) / 10}
  </div>
</div>
