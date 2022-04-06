<script>
  export let data;
  export let min = 0;
  export let max = 1000;
</script>

<div class="w-full">
  <slot />&nbsp;
  <span class="font-semibold" class:warning={data < min || data > max}
    >{Math.round(data * 10) / 10}</span
  >
</div>
