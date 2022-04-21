<script>
  import katex from "katex";
  import Dynamic from "./Dynamic.svelte";
  import Calculated from "./Calculated.svelte";

  let VO2, BSA, MAP, feet, CM, KG, feetRemainder, CO, SV;
  let LB = 140,
    inches = 70,
    HGB = 14,
    Age = 50,
    SaO2 = 100,
    SvO2 = 70,
    CVP = 6,
    PASP = 18,
    PADP = 10,
    HR = 80,
    SBP = 120,
    DBP = 80,
    PAWP = 10;
  let HgbT = "Hgb";

  $: feet = inches / 12; // Converts inches to feet
  $: CM = inches * 2.54; // Converts inches to cm
  $: KG = LB * 0.45359237; // Converts lbs to kg
  $: feetRemainder = inches % 12; // for height, remainder inches

  $: BSA = Math.sqrt((inches * 2.54 * LB * 0.45359237) / 3600); // BSA based on height/weight
  $: Age >= 70 ? (VO2 = 110 * BSA) : (VO2 = 125 * BSA); // O2 delivery based on age and BSA
  $: CO = VO2 / (((SaO2 - SvO2) / 100) * HGB * 13.4); // Cardiac Output
  $: CO2 = (HR * SV) / 1000; // Cardiac output from SV
  $: CPO = (MAP * CO) / 451; // Cardiac Power Output
  $: CI = CO / BSA; // Cardiac Index

  $: SVR = (MAP - CVP) / CO;
  $: SVRI = (MAP - CVP) / CI;
  $: PVR = (MPAP - PAWP) / CO;
  $: PVRI = (MPAP - PAWP) / CI;

  $: MAP = (SBP + 2 * DBP) / 3;
  $: MPAP = (PASP + 2 * PADP) / 3;
  $: PAPI = (PASP - PADP) / CVP;

  $: SV = (CO / HR) * 1000;
  $: SVI = (CI / HR) * 1000;
  $: LVSW = SV * (MAP - PAWP) * 0.0136;
  $: LVSWI = SVI * (MAP - PAWP) * 0.0136;
  $: RVSW = SV * (MPAP - CVP) * 0.0136;
  $: RVSWI = SVI * (MPAP - CVP) * 0.0136;

  $: TPG = MPAP - PAWP;
  $: DPG = PADP - PAWP;

  let equation = "\\text{Click on a Variable Below To See Formula}";

  $: katexString = katex.renderToString(equation, {
    displayMode: true,
    throwOnError: false,
  });
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.css"
    integrity="sha384-AfEj0r4/OFrOo5t7NnNe46zW/tFgW6x/bCJG8FqQCEo3+Aro6EYUG4+cU+KJWu/X"
    crossorigin="anonymous"
  />
</svelte:head>

<main>
  <div
    class="container flex justify-center w-full h-screen align-middle md:h-auto"
  >
    <div
      class="flex flex-col w-full px-2 my-2 rounded-lg lg:mx-12 lg:px-24 lg:my-12 lg:pt-24 lg:pb-12 lg:border-2 lg:border-solid lg:border-zinc-900"
    >
      <div
        class="py-4 overflow-y-auto border-b h-3/5 md:h-auto md:mb-12 top border-zinc-400"
      >
        <h2>Extended Cardiac Physiology</h2>
        <div
          class="flex items-center justify-center w-full h-24 py-2 my-2 overflow-x-auto font-serif text-sm rounded-md bg-zinc-100"
        >
          <div class="flex-none w-full">{@html katexString}</div>
        </div>
        <div class="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-x-10">
          <Calculated
            data={CO}
            min={4}
            max={8}
            on:eq={() =>
              (equation =
                "\\text{CO} = \\frac{O_2\\text{ delivery}}{(S_aO_2 - S_vO_2)\\times 0.01\\times \\text{Hgb}\\times 13.4}=\\frac{\\text{HR}\\times\\text{SV}}{1000}(4 - 8\\;L/min)")}
          >
            Cardiac output (CO):
          </Calculated>

          <Calculated
            data={CI}
            min={2}
            max={4}
            on:eq={() => {
              equation =
                "\\text{CI} = \\frac{\\text{CO}}{\\text{body surface area}}\\;(2 - 4\\;L/min/m^2)";
            }}
          >
            Cardiac index (CI):
          </Calculated>

          <Calculated
            data={CPO}
            on:eq={() =>
              (equation =
                "\\text{CPO}=\\frac{\\text{MAP}\\times \\text{CO}}{451}\\;(W)")}
            >Cardiac power output (CPO):</Calculated
          >

          <Calculated
            data={SV}
            min={60}
            max={100}
            on:eq={() =>
              (equation =
                "\\text{SV}=\\frac{\\text{CO}}{\\text{HR}}\\times 1000\\;(60 - 80\\;ml/beat)")}
          >
            Stroke volume (SV):</Calculated
          >

          <Calculated
            data={SVI}
            min={33}
            max={47}
            on:eq={() =>
              (equation =
                "\\text{SVI}=\\frac{\\text{CI}}{\\text{HR}}\\times 1000\\;(33 - 47\\;ml/m^2/beat)")}
            >Stroke volume index (SVI):</Calculated
          >

          <Calculated
            data={MAP}
            min={70}
            max={105}
            on:eq={() =>
              (equation =
                "\\text{MAP} = \\frac{\\text{SBP} + 2\\times \\text{DBP}}{3}\\;(70-105\\;mmHg)")}
            >Mean artery pressure (MAP):</Calculated
          >

          <Calculated
            data={SVR}
            min={8}
            max={20}
            on:eq={() =>
              (equation =
                "\\text{SVR} = \\frac{\\text{MAP} - \\text{CVP}}{\\text{CO}}\\;(8-20\\;mmHg·min/L)")}
          >
            Systemic vascular resistance (SVR):
          </Calculated>

          <Calculated
            data={SVRI}
            min={24}
            max={30}
            on:eq={() =>
              (equation =
                "\\text{SVRI} = \\frac{\\text{MAP} - \\text{CVP}}{\\text{CI}}\\;(24 – 30\\;mmHg·min/L/m^2)")}
          >
            Systemic vascular resistance index (SVRI):
          </Calculated>

          <Calculated
            data={MPAP}
            min={10}
            max={20}
            on:eq={() =>
              (equation =
                "\\text{mPAP} = \\frac{\\text{PASP} + 2\\times \\text{PADP}}{3}\\;(10-20\\;mmHg)")}
          >
            Mean pulmonary artery pressure (mPAP):
          </Calculated>

          <Calculated
            data={PVR}
            max={3}
            on:eq={() =>
              (equation =
                "\\text{PVR} = \\frac{\\text{TPG}}{\\text{CO}}\\;(<3\\;mmHg·min/L)")}
          >
            Pulmonary vascular resistance (PVR):
          </Calculated>

          <Calculated
            data={PVRI}
            min={3}
            max={3.6}
            on:eq={() =>
              (equation =
                "\\text{PVRI} = \\frac{\\text{TPG}}{\\text{CI}}\\;(3-3.6\\;mmHg·min/L/m^2)")}
          >
            Pulmonary vascular resistance index (PVRI):
          </Calculated>

          <Calculated
            data={PAPI}
            on:eq={() =>
              (equation =
                "\\text{PAPi} = \\frac{\\text{PASP} - \\text{PADP}}{\\text{CVP}}")}
          >
            Pulmonary artery pulsatile index (PAPi):
          </Calculated>

          <Calculated
            data={TPG}
            on:eq={() =>
              (equation = "\\text{TPG} = \\text{mPAP} - \\text{PAWP}\\;(mmHg)")}
          >
            Transpulmonary pressure gradient (TPG):
          </Calculated>

          <Calculated
            data={DPG}
            min={5}
            max={10}
            on:eq={() =>
              (equation = "\\text{DPG} = \\text{PADP} - \\text{PAWP}\\;(mmHg)")}
          >
            Diastolic pressure gradient (DPG):
          </Calculated>

          <Calculated
            data={LVSW}
            min={58}
            max={104}
            on:eq={() =>
              (equation =
                "\\text{LVSW} = \\text{SV}\\times(\\text{MAP} - \\text{PAWP})\\times 0.0136\\;(58 - 104\\;gm·m/beat)")}
          >
            Left ventricular stroke work (LVSW):
          </Calculated>

          <Calculated
            data={LVSWI}
            min={50}
            max={62}
            on:eq={() =>
              (equation =
                "\\text{LVSWI} = \\text{SVI}\\times(\\text{PAWP} - \\text{CVP})\\times 0.0136\\;(50 - 62\\;gm·m/m^2/beat)")}
          >
            Left ventricular stroke work index (LVSWI):
          </Calculated>

          <Calculated
            data={RVSW}
            min={8}
            max={16}
            on:eq={() =>
              (equation =
                "\\text{RVSW} = \\text{SV}\\times(\\text{mPAP} - \\text{CVP})\\times 0.0136\\;(8 - 16\\;gm·m/beat)")}
          >
            Right ventricular stroke work (RVSW):
          </Calculated>

          <Calculated
            data={RVSWI}
            min={5}
            max={10}
            on:eq={() =>
              (equation =
                "\\text{RVSWI} = \\text{SVI}\\times(\\text{mPAP} - \\text{CVP})\\times 0.0136\\;(5 - 10\\;gm·m/m^2/beat)")}
          >
            Right ventricular stroke work index (RVSWI):
          </Calculated>
        </div>
      </div>
      <div
        class="grid grid-cols-1 mt-4 overflow-y-auto h-2/5 md:h-auto md:mt-4 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2 bottom"
      >
        <Dynamic min={40} max={300} bind:result={LB}>
          Weight (lbs)
          {Math.round(KG)} Kg
        </Dynamic>

        <Dynamic min={53} max={76} bind:result={inches}>
          Height (in)
          {Math.floor(feet)}"{Math.round(feetRemainder)}
          {Math.round(CM * 100) / 100} cm
        </Dynamic>

        <Dynamic min={60} max={100} bind:result={SaO2}>SaO2 (%)</Dynamic>

        <Dynamic min={30} max={100} bind:result={SvO2}>SvO2 (%)</Dynamic>

        <Dynamic
          min={4}
          max={17}
          step={0.1}
          bind:result={HGB}
          on:slide={() => {
            HgbT;
          }}
        >
          Hemoglobin (g/dL)
        </Dynamic>

        <Dynamic min={1} max={100} bind:result={Age}>Age (years)</Dynamic>

        <Dynamic
          min={20}
          max={200}
          bind:result={HR}
          on:slide={() => {
            console.log(HR, SV, CO2);
          }}>HR (beats per min)</Dynamic
        >

        <Dynamic min={1} max={15} bind:result={CO}>
          Cardiac Output (L/min)
        </Dynamic>

        <Dynamic
          min={10}
          max={150}
          bind:result={SV}
          on:slide={() => {
            CO = CO2;
          }}>Stroke volume (mL)</Dynamic
        >

        <Dynamic min={0} max={100} bind:result={SVI}>
          Stroke volume index (mL/m^2)
        </Dynamic>

        <Dynamic min={60} max={240} bind:result={SBP}>
          Systolic blood pressure (mmHg)
        </Dynamic>

        <Dynamic min={10} max={120} bind:result={DBP}>
          Diastolic blood pressure (mmHg)
        </Dynamic>

        <Dynamic min={15} max={25} bind:result={PASP}>
          PA systolic pressure (mmHg)
        </Dynamic>

        <Dynamic min={8} max={15} bind:result={PADP}>
          PA diastolic pressure (mmHg)
        </Dynamic>

        <Dynamic min={0} max={20} bind:result={CVP}>CVP (mmHg)</Dynamic>

        <Dynamic min={0} max={35} bind:result={PAWP}>
          Pulmonary arterial wedge pressure (mmHg)
        </Dynamic>
      </div>
      <div class="text-sm font-semibold text-center md:mt-12">
        Contact me on <a
          class="font-sans hover:underline"
          href="https://github.com/kangruixiang/extended-cardiac-physiology"
          >Github</a
        > for questions or suggestions.
      </div>
    </div>
  </div>
</main>

<style global>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @font-face {
    font-family: "Concourse";
    src: url("fonts/concourse_3_regular.woff2") format("woff2");
    font-style: normal;
  }
  @font-face {
    font-family: "Equity";
    src: url("fonts/equity_a_regular.woff2") format("woff2");
    font-style: normal;
  }
  @layer components {
    body {
      @apply text-zinc-800 text-lg font-serif;
    }
    h1 {
      @apply text-xl font-bold uppercase mb-4;
    }
    h2 {
      @apply text-lg font-bold uppercase mb-2;
    }
    p {
      @apply text-zinc-800 text-lg font-serif;
    }
    ::selection {
      @apply bg-slate-200;
    }
    .btn {
      @apply btn-disabled p-3 shadow font-semibold rounded-lg border-2 border-solid border-zinc-800 bg-zinc-50
		font-sans hover:bg-white text-zinc-800 hover:text-black;
    }
    .btn-dark {
      @apply btn border-0 bg-zinc-800 text-zinc-50 hover:bg-zinc-900 hover:text-white transition duration-300;
    }
    .btn-disabled {
      @apply disabled:text-zinc-500 disabled:hover:text-zinc-500 disabled:bg-zinc-50 disabled:hover:bg-zinc-50 disabled:border-zinc-500 disabled:hover:border-zinc-500;
    }
    .select {
      @apply font-semibold focus:outline-none focus:bg-white focus:border-zinc-800 border-zinc-800 border-2 border-solid bg-zinc-50 text-zinc-800 rounded-md   outline-none focus:ring-0;
    }
    .label {
      @apply font-semibold text-sm font-sans;
    }
    .input-text {
      @apply px-2 max-h-12 focus:bg-white focus:ring-0 w-12   focus:border-zinc-800 border-zinc-200  py-2 rounded-md bg-zinc-50  font-semibold;
    }
    .input-checkbox {
      @apply rounded-sm border-2 border-solid w-4 h-4 focus:ring-0  text-zinc-800 border-zinc-800;
    }
    .warning {
      @apply text-red-700;
    }
    input[type="range"] {
      @apply flex-grow;
    }
    .line {
      @apply flex space-x-2 items-center;
    }
  }
</style>
