<script>
  import { createEventDispatcher } from "svelte";
  export let result;
  export let min;
  export let max;
  export let step = 1;

  const dispatch = createEventDispatcher();

  function sendData() {
    dispatch("slide", {
      result,
    });
  }
</script>

<div>
  <label class="label" for={result}><slot /></label>
  <div class="line">
    <input
      type="range"
      id={result}
      bind:value={result}
      on:input={sendData}
      {min}
      {max}
      {step}
    />
    <input
      type="text"
      class="input-text"
      bind:value={result}
      on:change={sendData}
    />
  </div>
</div>
