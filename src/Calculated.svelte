<script>
  export let data;
  export let min;
  export let max;
</script>

<div class="w-full">
  <slot />&nbsp;
  <span class="font-semibold" class:warning={data < min || data > max}
    >{Math.round(data * 10) / 10}</span
  >
</div>
