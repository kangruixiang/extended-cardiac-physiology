
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Dynamic.svelte generated by Svelte v3.46.4 */
    const file$2 = "src\\Dynamic.svelte";

    function create_fragment$2(ctx) {
    	let div1;
    	let label;
    	let t0;
    	let div0;
    	let input0;
    	let t1;
    	let input1;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			label = element("label");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t1 = space();
    			input1 = element("input");
    			attr_dev(label, "class", "label");
    			attr_dev(label, "for", /*result*/ ctx[0]);
    			add_location(label, file$2, 17, 2, 295);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "id", /*result*/ ctx[0]);
    			attr_dev(input0, "min", /*min*/ ctx[1]);
    			attr_dev(input0, "max", /*max*/ ctx[2]);
    			attr_dev(input0, "step", /*step*/ ctx[3]);
    			add_location(input0, file$2, 19, 4, 373);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "input-text");
    			add_location(input1, file$2, 28, 4, 526);
    			attr_dev(div0, "class", "line");
    			add_location(div0, file$2, 18, 2, 349);
    			add_location(div1, file$2, 16, 0, 286);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, label);

    			if (default_slot) {
    				default_slot.m(label, null);
    			}

    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*result*/ ctx[0]);
    			append_dev(div0, t1);
    			append_dev(div0, input1);
    			set_input_value(input1, /*result*/ ctx[0]);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[7]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[7]),
    					listen_dev(input0, "input", /*sendData*/ ctx[4], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[8]),
    					listen_dev(input1, "change", /*sendData*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[5],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*result*/ 1) {
    				attr_dev(label, "for", /*result*/ ctx[0]);
    			}

    			if (!current || dirty & /*result*/ 1) {
    				attr_dev(input0, "id", /*result*/ ctx[0]);
    			}

    			if (!current || dirty & /*min*/ 2) {
    				attr_dev(input0, "min", /*min*/ ctx[1]);
    			}

    			if (!current || dirty & /*max*/ 4) {
    				attr_dev(input0, "max", /*max*/ ctx[2]);
    			}

    			if (!current || dirty & /*step*/ 8) {
    				attr_dev(input0, "step", /*step*/ ctx[3]);
    			}

    			if (dirty & /*result*/ 1) {
    				set_input_value(input0, /*result*/ ctx[0]);
    			}

    			if (dirty & /*result*/ 1 && input1.value !== /*result*/ ctx[0]) {
    				set_input_value(input1, /*result*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Dynamic', slots, ['default']);
    	let { result } = $$props;
    	let { min } = $$props;
    	let { max } = $$props;
    	let { step = 1 } = $$props;
    	const dispatch = createEventDispatcher();

    	function sendData() {
    		dispatch("slide", { result });
    	}

    	const writable_props = ['result', 'min', 'max', 'step'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Dynamic> was created with unknown prop '${key}'`);
    	});

    	function input0_change_input_handler() {
    		result = to_number(this.value);
    		$$invalidate(0, result);
    	}

    	function input1_input_handler() {
    		result = this.value;
    		$$invalidate(0, result);
    	}

    	$$self.$$set = $$props => {
    		if ('result' in $$props) $$invalidate(0, result = $$props.result);
    		if ('min' in $$props) $$invalidate(1, min = $$props.min);
    		if ('max' in $$props) $$invalidate(2, max = $$props.max);
    		if ('step' in $$props) $$invalidate(3, step = $$props.step);
    		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		result,
    		min,
    		max,
    		step,
    		dispatch,
    		sendData
    	});

    	$$self.$inject_state = $$props => {
    		if ('result' in $$props) $$invalidate(0, result = $$props.result);
    		if ('min' in $$props) $$invalidate(1, min = $$props.min);
    		if ('max' in $$props) $$invalidate(2, max = $$props.max);
    		if ('step' in $$props) $$invalidate(3, step = $$props.step);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		result,
    		min,
    		max,
    		step,
    		sendData,
    		$$scope,
    		slots,
    		input0_change_input_handler,
    		input1_input_handler
    	];
    }

    class Dynamic extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { result: 0, min: 1, max: 2, step: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dynamic",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*result*/ ctx[0] === undefined && !('result' in props)) {
    			console.warn("<Dynamic> was created without expected prop 'result'");
    		}

    		if (/*min*/ ctx[1] === undefined && !('min' in props)) {
    			console.warn("<Dynamic> was created without expected prop 'min'");
    		}

    		if (/*max*/ ctx[2] === undefined && !('max' in props)) {
    			console.warn("<Dynamic> was created without expected prop 'max'");
    		}
    	}

    	get result() {
    		throw new Error("<Dynamic>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set result(value) {
    		throw new Error("<Dynamic>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<Dynamic>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<Dynamic>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<Dynamic>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<Dynamic>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get step() {
    		throw new Error("<Dynamic>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set step(value) {
    		throw new Error("<Dynamic>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Calculated.svelte generated by Svelte v3.46.4 */

    const file$1 = "src\\Calculated.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let t0;
    	let span;
    	let t1_value = Math.round(/*data*/ ctx[0] * 10) / 10 + "";
    	let t1;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			t0 = text(" \r\n  ");
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(span, "class", "font-semibold");
    			toggle_class(span, "warning", /*data*/ ctx[0] < /*min*/ ctx[1] || /*data*/ ctx[0] > /*max*/ ctx[2]);
    			add_location(span, file$1, 8, 2, 123);
    			attr_dev(div, "class", "w-full");
    			add_location(div, file$1, 6, 0, 81);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(span, t1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
    						null
    					);
    				}
    			}

    			if ((!current || dirty & /*data*/ 1) && t1_value !== (t1_value = Math.round(/*data*/ ctx[0] * 10) / 10 + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*data, min, max*/ 7) {
    				toggle_class(span, "warning", /*data*/ ctx[0] < /*min*/ ctx[1] || /*data*/ ctx[0] > /*max*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Calculated', slots, ['default']);
    	let { data } = $$props;
    	let { min } = $$props;
    	let { max } = $$props;
    	const writable_props = ['data', 'min', 'max'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Calculated> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('min' in $$props) $$invalidate(1, min = $$props.min);
    		if ('max' in $$props) $$invalidate(2, max = $$props.max);
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ data, min, max });

    	$$self.$inject_state = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('min' in $$props) $$invalidate(1, min = $$props.min);
    		if ('max' in $$props) $$invalidate(2, max = $$props.max);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [data, min, max, $$scope, slots];
    }

    class Calculated extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { data: 0, min: 1, max: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Calculated",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !('data' in props)) {
    			console.warn("<Calculated> was created without expected prop 'data'");
    		}

    		if (/*min*/ ctx[1] === undefined && !('min' in props)) {
    			console.warn("<Calculated> was created without expected prop 'min'");
    		}

    		if (/*max*/ ctx[2] === undefined && !('max' in props)) {
    			console.warn("<Calculated> was created without expected prop 'max'");
    		}
    	}

    	get data() {
    		throw new Error("<Calculated>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Calculated>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<Calculated>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<Calculated>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<Calculated>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<Calculated>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.4 */
    const file = "src\\App.svelte";

    // (58:10) <Calculated data={CO} min={4}>
    function create_default_slot_33(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Cardiac output (CO) (4 - 8 L/min):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_33.name,
    		type: "slot",
    		source: "(58:10) <Calculated data={CO} min={4}>",
    		ctx
    	});

    	return block;
    }

    // (62:10) <Calculated data={CI} min={2}>
    function create_default_slot_32(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Cardiac index (CI) (2 - 4 L/min/m2):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_32.name,
    		type: "slot",
    		source: "(62:10) <Calculated data={CI} min={2}>",
    		ctx
    	});

    	return block;
    }

    // (66:10) <Calculated data={CPO}>
    function create_default_slot_31(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Cardiac power output (CPO):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_31.name,
    		type: "slot",
    		source: "(66:10) <Calculated data={CPO}>",
    		ctx
    	});

    	return block;
    }

    // (68:10) <Calculated data={PAPI}>
    function create_default_slot_30(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Pulmonary artery pulsatile index (PAPI):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_30.name,
    		type: "slot",
    		source: "(68:10) <Calculated data={PAPI}>",
    		ctx
    	});

    	return block;
    }

    // (72:10) <Calculated data={SV}>
    function create_default_slot_29(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Stroke volume (SV):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_29.name,
    		type: "slot",
    		source: "(72:10) <Calculated data={SV}>",
    		ctx
    	});

    	return block;
    }

    // (74:10) <Calculated data={SVI}>
    function create_default_slot_28(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Stroke volume index (SVI):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_28.name,
    		type: "slot",
    		source: "(74:10) <Calculated data={SVI}>",
    		ctx
    	});

    	return block;
    }

    // (76:10) <Calculated data={MAP}>
    function create_default_slot_27(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Mean Artery Pressure (MAP):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_27.name,
    		type: "slot",
    		source: "(76:10) <Calculated data={MAP}>",
    		ctx
    	});

    	return block;
    }

    // (78:10) <Calculated data={SVR} min={900} max={1440}>
    function create_default_slot_26(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Systemic vascular resistance (SVR):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_26.name,
    		type: "slot",
    		source: "(78:10) <Calculated data={SVR} min={900} max={1440}>",
    		ctx
    	});

    	return block;
    }

    // (82:10) <Calculated data={SVRI}>
    function create_default_slot_25(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Systemic vascular resistance index (SVRI):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_25.name,
    		type: "slot",
    		source: "(82:10) <Calculated data={SVRI}>",
    		ctx
    	});

    	return block;
    }

    // (86:10) <Calculated data={MPAP}>
    function create_default_slot_24(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Mean Pulmonary Artery Pressure (MPAP):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_24.name,
    		type: "slot",
    		source: "(86:10) <Calculated data={MPAP}>",
    		ctx
    	});

    	return block;
    }

    // (90:10) <Calculated data={PVR}>
    function create_default_slot_23(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Pulmonary vascular resistance (PVR):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_23.name,
    		type: "slot",
    		source: "(90:10) <Calculated data={PVR}>",
    		ctx
    	});

    	return block;
    }

    // (94:10) <Calculated data={PVRI}>
    function create_default_slot_22(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Pulmonary vascular resistance index (PVRI):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_22.name,
    		type: "slot",
    		source: "(94:10) <Calculated data={PVRI}>",
    		ctx
    	});

    	return block;
    }

    // (98:10) <Calculated data={LVSW}>
    function create_default_slot_21(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Left ventricular stroke work (LVSW):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_21.name,
    		type: "slot",
    		source: "(98:10) <Calculated data={LVSW}>",
    		ctx
    	});

    	return block;
    }

    // (102:10) <Calculated data={LVSWI}>
    function create_default_slot_20(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Left ventricular stroke work index (LVSWI):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_20.name,
    		type: "slot",
    		source: "(102:10) <Calculated data={LVSWI}>",
    		ctx
    	});

    	return block;
    }

    // (106:10) <Calculated data={RVSW}>
    function create_default_slot_19(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Right ventricular stroke work (RVSW):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_19.name,
    		type: "slot",
    		source: "(106:10) <Calculated data={RVSW}>",
    		ctx
    	});

    	return block;
    }

    // (110:10) <Calculated data={RVSWI}>
    function create_default_slot_18(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Right ventricular stroke work index (RVSWI):");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_18.name,
    		type: "slot",
    		source: "(110:10) <Calculated data={RVSWI}>",
    		ctx
    	});

    	return block;
    }

    // (118:8) <Dynamic min={40} max={300} bind:result={LB}>
    function create_default_slot_17(ctx) {
    	let t0;
    	let t1_value = Math.round(/*KG*/ ctx[21]) + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = text("Weight (lbs)\n          ");
    			t1 = text(t1_value);
    			t2 = text(" Kg");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*KG*/ 2097152 && t1_value !== (t1_value = Math.round(/*KG*/ ctx[21]) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_17.name,
    		type: "slot",
    		source: "(118:8) <Dynamic min={40} max={300} bind:result={LB}>",
    		ctx
    	});

    	return block;
    }

    // (123:8) <Dynamic min={53} max={76} bind:result={inches}>
    function create_default_slot_16(ctx) {
    	let t0;
    	let t1_value = Math.floor(/*feet*/ ctx[19]) + "";
    	let t1;
    	let t2;
    	let t3_value = Math.round(/*feetRemainder*/ ctx[22]) + "";
    	let t3;
    	let t4;
    	let t5_value = Math.round(/*CM*/ ctx[20] * 100) / 100 + "";
    	let t5;
    	let t6;

    	const block = {
    		c: function create() {
    			t0 = text("Height (in)\n          ");
    			t1 = text(t1_value);
    			t2 = text("\"");
    			t3 = text(t3_value);
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = text(" cm");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, t6, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*feet*/ 524288 && t1_value !== (t1_value = Math.floor(/*feet*/ ctx[19]) + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*feetRemainder*/ 4194304 && t3_value !== (t3_value = Math.round(/*feetRemainder*/ ctx[22]) + "")) set_data_dev(t3, t3_value);
    			if (dirty[0] & /*CM*/ 1048576 && t5_value !== (t5_value = Math.round(/*CM*/ ctx[20] * 100) / 100 + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(t6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_16.name,
    		type: "slot",
    		source: "(123:8) <Dynamic min={53} max={76} bind:result={inches}>",
    		ctx
    	});

    	return block;
    }

    // (129:8) <Dynamic min={60} max={100} bind:result={SaO2}>
    function create_default_slot_15(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("SaO2");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_15.name,
    		type: "slot",
    		source: "(129:8) <Dynamic min={60} max={100} bind:result={SaO2}>",
    		ctx
    	});

    	return block;
    }

    // (131:8) <Dynamic min={30} max={100} bind:result={SvO2}>
    function create_default_slot_14(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("SvO2");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_14.name,
    		type: "slot",
    		source: "(131:8) <Dynamic min={30} max={100} bind:result={SvO2}>",
    		ctx
    	});

    	return block;
    }

    // (133:8) <Dynamic min={4} max={17} step={0.1} bind:result={HGB}>
    function create_default_slot_13(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Hemoglobin");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_13.name,
    		type: "slot",
    		source: "(133:8) <Dynamic min={4} max={17} step={0.1} bind:result={HGB}>",
    		ctx
    	});

    	return block;
    }

    // (137:8) <Dynamic min={1} max={100} bind:result={Age}>
    function create_default_slot_12(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Age");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_12.name,
    		type: "slot",
    		source: "(137:8) <Dynamic min={1} max={100} bind:result={Age}>",
    		ctx
    	});

    	return block;
    }

    // (139:8) <Dynamic min={20} max={200} bind:result={HR}>
    function create_default_slot_11(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("HR");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_11.name,
    		type: "slot",
    		source: "(139:8) <Dynamic min={20} max={200} bind:result={HR}>",
    		ctx
    	});

    	return block;
    }

    // (141:8) <Dynamic min={1} max={15} bind:result={CO}>
    function create_default_slot_10(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("CO calculated using O2 delivery");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(141:8) <Dynamic min={1} max={15} bind:result={CO}>",
    		ctx
    	});

    	return block;
    }

    // (145:8) <Dynamic min={1} max={15} bind:result={CO2}>
    function create_default_slot_9(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("CO calculated using stroke volume");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(145:8) <Dynamic min={1} max={15} bind:result={CO2}>",
    		ctx
    	});

    	return block;
    }

    // (149:8) <Dynamic min={10} max={150} bind:result={SV}>
    function create_default_slot_8(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Stroke volume");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(149:8) <Dynamic min={10} max={150} bind:result={SV}>",
    		ctx
    	});

    	return block;
    }

    // (151:8) <Dynamic min={0} max={100} bind:result={SVI}>
    function create_default_slot_7(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Stroke volume index");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(151:8) <Dynamic min={0} max={100} bind:result={SVI}>",
    		ctx
    	});

    	return block;
    }

    // (155:8) <Dynamic min={60} max={240} bind:result={SBP}>
    function create_default_slot_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Systolic blood pressure");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(155:8) <Dynamic min={60} max={240} bind:result={SBP}>",
    		ctx
    	});

    	return block;
    }

    // (159:8) <Dynamic min={10} max={120} bind:result={DBP}>
    function create_default_slot_5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Diastolic blood pressure");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(159:8) <Dynamic min={10} max={120} bind:result={DBP}>",
    		ctx
    	});

    	return block;
    }

    // (163:8) <Dynamic min={15} max={25} bind:result={PASP}>
    function create_default_slot_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("PA systolic pressure");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(163:8) <Dynamic min={15} max={25} bind:result={PASP}>",
    		ctx
    	});

    	return block;
    }

    // (167:8) <Dynamic min={8} max={15} bind:result={PADP}>
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("PA diastolic pressure");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(167:8) <Dynamic min={8} max={15} bind:result={PADP}>",
    		ctx
    	});

    	return block;
    }

    // (171:8) <Dynamic min={0} max={20} bind:result={CVP}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("CVP");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(171:8) <Dynamic min={0} max={20} bind:result={CVP}>",
    		ctx
    	});

    	return block;
    }

    // (173:8) <Dynamic min={0} max={35} bind:result={PAWP}>
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Pulmonary arterial wedge pressure");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(173:8) <Dynamic min={0} max={35} bind:result={PAWP}>",
    		ctx
    	});

    	return block;
    }

    // (177:8) <Dynamic min={15} max={70} bind:result={EF}>
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Ejection fraction");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(177:8) <Dynamic min={15} max={70} bind:result={EF}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div4;
    	let div3;
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let calculated0;
    	let t2;
    	let calculated1;
    	let t3;
    	let calculated2;
    	let t4;
    	let calculated3;
    	let t5;
    	let calculated4;
    	let t6;
    	let calculated5;
    	let t7;
    	let calculated6;
    	let t8;
    	let calculated7;
    	let t9;
    	let calculated8;
    	let t10;
    	let calculated9;
    	let t11;
    	let calculated10;
    	let t12;
    	let calculated11;
    	let t13;
    	let calculated12;
    	let t14;
    	let calculated13;
    	let t15;
    	let calculated14;
    	let t16;
    	let calculated15;
    	let t17;
    	let div2;
    	let dynamic0;
    	let updating_result;
    	let t18;
    	let dynamic1;
    	let updating_result_1;
    	let t19;
    	let dynamic2;
    	let updating_result_2;
    	let t20;
    	let dynamic3;
    	let updating_result_3;
    	let t21;
    	let dynamic4;
    	let updating_result_4;
    	let t22;
    	let dynamic5;
    	let updating_result_5;
    	let t23;
    	let dynamic6;
    	let updating_result_6;
    	let t24;
    	let dynamic7;
    	let updating_result_7;
    	let t25;
    	let dynamic8;
    	let updating_result_8;
    	let t26;
    	let dynamic9;
    	let updating_result_9;
    	let t27;
    	let dynamic10;
    	let updating_result_10;
    	let t28;
    	let dynamic11;
    	let updating_result_11;
    	let t29;
    	let dynamic12;
    	let updating_result_12;
    	let t30;
    	let dynamic13;
    	let updating_result_13;
    	let t31;
    	let dynamic14;
    	let updating_result_14;
    	let t32;
    	let dynamic15;
    	let updating_result_15;
    	let t33;
    	let dynamic16;
    	let updating_result_16;
    	let t34;
    	let dynamic17;
    	let updating_result_17;
    	let current;

    	calculated0 = new Calculated({
    			props: {
    				data: /*CO*/ ctx[1],
    				min: 4,
    				$$slots: { default: [create_default_slot_33] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated1 = new Calculated({
    			props: {
    				data: /*CI*/ ctx[18],
    				min: 2,
    				$$slots: { default: [create_default_slot_32] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated2 = new Calculated({
    			props: {
    				data: /*CPO*/ ctx[33],
    				$$slots: { default: [create_default_slot_31] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated3 = new Calculated({
    			props: {
    				data: /*PAPI*/ ctx[28],
    				$$slots: { default: [create_default_slot_30] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated4 = new Calculated({
    			props: {
    				data: /*SV*/ ctx[2],
    				$$slots: { default: [create_default_slot_29] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated5 = new Calculated({
    			props: {
    				data: /*SVI*/ ctx[17],
    				$$slots: { default: [create_default_slot_28] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated6 = new Calculated({
    			props: {
    				data: /*MAP*/ ctx[0],
    				$$slots: { default: [create_default_slot_27] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated7 = new Calculated({
    			props: {
    				data: /*SVR*/ ctx[32],
    				min: 900,
    				max: 1440,
    				$$slots: { default: [create_default_slot_26] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated8 = new Calculated({
    			props: {
    				data: /*SVRI*/ ctx[31],
    				$$slots: { default: [create_default_slot_25] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated9 = new Calculated({
    			props: {
    				data: /*MPAP*/ ctx[16],
    				$$slots: { default: [create_default_slot_24] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated10 = new Calculated({
    			props: {
    				data: /*PVR*/ ctx[30],
    				$$slots: { default: [create_default_slot_23] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated11 = new Calculated({
    			props: {
    				data: /*PVRI*/ ctx[29],
    				$$slots: { default: [create_default_slot_22] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated12 = new Calculated({
    			props: {
    				data: /*LVSW*/ ctx[27],
    				$$slots: { default: [create_default_slot_21] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated13 = new Calculated({
    			props: {
    				data: /*LVSWI*/ ctx[26],
    				$$slots: { default: [create_default_slot_20] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated14 = new Calculated({
    			props: {
    				data: /*RVSW*/ ctx[25],
    				$$slots: { default: [create_default_slot_19] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	calculated15 = new Calculated({
    			props: {
    				data: /*RVSWI*/ ctx[24],
    				$$slots: { default: [create_default_slot_18] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	function dynamic0_result_binding(value) {
    		/*dynamic0_result_binding*/ ctx[37](value);
    	}

    	let dynamic0_props = {
    		min: 40,
    		max: 300,
    		$$slots: { default: [create_default_slot_17] },
    		$$scope: { ctx }
    	};

    	if (/*LB*/ ctx[3] !== void 0) {
    		dynamic0_props.result = /*LB*/ ctx[3];
    	}

    	dynamic0 = new Dynamic({ props: dynamic0_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic0, 'result', dynamic0_result_binding));

    	function dynamic1_result_binding(value) {
    		/*dynamic1_result_binding*/ ctx[38](value);
    	}

    	let dynamic1_props = {
    		min: 53,
    		max: 76,
    		$$slots: { default: [create_default_slot_16] },
    		$$scope: { ctx }
    	};

    	if (/*inches*/ ctx[4] !== void 0) {
    		dynamic1_props.result = /*inches*/ ctx[4];
    	}

    	dynamic1 = new Dynamic({ props: dynamic1_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic1, 'result', dynamic1_result_binding));

    	function dynamic2_result_binding(value) {
    		/*dynamic2_result_binding*/ ctx[39](value);
    	}

    	let dynamic2_props = {
    		min: 60,
    		max: 100,
    		$$slots: { default: [create_default_slot_15] },
    		$$scope: { ctx }
    	};

    	if (/*SaO2*/ ctx[7] !== void 0) {
    		dynamic2_props.result = /*SaO2*/ ctx[7];
    	}

    	dynamic2 = new Dynamic({ props: dynamic2_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic2, 'result', dynamic2_result_binding));

    	function dynamic3_result_binding(value) {
    		/*dynamic3_result_binding*/ ctx[40](value);
    	}

    	let dynamic3_props = {
    		min: 30,
    		max: 100,
    		$$slots: { default: [create_default_slot_14] },
    		$$scope: { ctx }
    	};

    	if (/*SvO2*/ ctx[8] !== void 0) {
    		dynamic3_props.result = /*SvO2*/ ctx[8];
    	}

    	dynamic3 = new Dynamic({ props: dynamic3_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic3, 'result', dynamic3_result_binding));

    	function dynamic4_result_binding(value) {
    		/*dynamic4_result_binding*/ ctx[41](value);
    	}

    	let dynamic4_props = {
    		min: 4,
    		max: 17,
    		step: 0.1,
    		$$slots: { default: [create_default_slot_13] },
    		$$scope: { ctx }
    	};

    	if (/*HGB*/ ctx[5] !== void 0) {
    		dynamic4_props.result = /*HGB*/ ctx[5];
    	}

    	dynamic4 = new Dynamic({ props: dynamic4_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic4, 'result', dynamic4_result_binding));

    	function dynamic5_result_binding(value) {
    		/*dynamic5_result_binding*/ ctx[42](value);
    	}

    	let dynamic5_props = {
    		min: 1,
    		max: 100,
    		$$slots: { default: [create_default_slot_12] },
    		$$scope: { ctx }
    	};

    	if (/*Age*/ ctx[6] !== void 0) {
    		dynamic5_props.result = /*Age*/ ctx[6];
    	}

    	dynamic5 = new Dynamic({ props: dynamic5_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic5, 'result', dynamic5_result_binding));

    	function dynamic6_result_binding(value) {
    		/*dynamic6_result_binding*/ ctx[43](value);
    	}

    	let dynamic6_props = {
    		min: 20,
    		max: 200,
    		$$slots: { default: [create_default_slot_11] },
    		$$scope: { ctx }
    	};

    	if (/*HR*/ ctx[12] !== void 0) {
    		dynamic6_props.result = /*HR*/ ctx[12];
    	}

    	dynamic6 = new Dynamic({ props: dynamic6_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic6, 'result', dynamic6_result_binding));

    	function dynamic7_result_binding(value) {
    		/*dynamic7_result_binding*/ ctx[44](value);
    	}

    	let dynamic7_props = {
    		min: 1,
    		max: 15,
    		$$slots: { default: [create_default_slot_10] },
    		$$scope: { ctx }
    	};

    	if (/*CO*/ ctx[1] !== void 0) {
    		dynamic7_props.result = /*CO*/ ctx[1];
    	}

    	dynamic7 = new Dynamic({ props: dynamic7_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic7, 'result', dynamic7_result_binding));

    	function dynamic8_result_binding(value) {
    		/*dynamic8_result_binding*/ ctx[45](value);
    	}

    	let dynamic8_props = {
    		min: 1,
    		max: 15,
    		$$slots: { default: [create_default_slot_9] },
    		$$scope: { ctx }
    	};

    	if (/*CO2*/ ctx[34] !== void 0) {
    		dynamic8_props.result = /*CO2*/ ctx[34];
    	}

    	dynamic8 = new Dynamic({ props: dynamic8_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic8, 'result', dynamic8_result_binding));

    	function dynamic9_result_binding(value) {
    		/*dynamic9_result_binding*/ ctx[46](value);
    	}

    	let dynamic9_props = {
    		min: 10,
    		max: 150,
    		$$slots: { default: [create_default_slot_8] },
    		$$scope: { ctx }
    	};

    	if (/*SV*/ ctx[2] !== void 0) {
    		dynamic9_props.result = /*SV*/ ctx[2];
    	}

    	dynamic9 = new Dynamic({ props: dynamic9_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic9, 'result', dynamic9_result_binding));

    	function dynamic10_result_binding(value) {
    		/*dynamic10_result_binding*/ ctx[47](value);
    	}

    	let dynamic10_props = {
    		min: 0,
    		max: 100,
    		$$slots: { default: [create_default_slot_7] },
    		$$scope: { ctx }
    	};

    	if (/*SVI*/ ctx[17] !== void 0) {
    		dynamic10_props.result = /*SVI*/ ctx[17];
    	}

    	dynamic10 = new Dynamic({ props: dynamic10_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic10, 'result', dynamic10_result_binding));

    	function dynamic11_result_binding(value) {
    		/*dynamic11_result_binding*/ ctx[48](value);
    	}

    	let dynamic11_props = {
    		min: 60,
    		max: 240,
    		$$slots: { default: [create_default_slot_6] },
    		$$scope: { ctx }
    	};

    	if (/*SBP*/ ctx[13] !== void 0) {
    		dynamic11_props.result = /*SBP*/ ctx[13];
    	}

    	dynamic11 = new Dynamic({ props: dynamic11_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic11, 'result', dynamic11_result_binding));

    	function dynamic12_result_binding(value) {
    		/*dynamic12_result_binding*/ ctx[49](value);
    	}

    	let dynamic12_props = {
    		min: 10,
    		max: 120,
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	};

    	if (/*DBP*/ ctx[14] !== void 0) {
    		dynamic12_props.result = /*DBP*/ ctx[14];
    	}

    	dynamic12 = new Dynamic({ props: dynamic12_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic12, 'result', dynamic12_result_binding));

    	function dynamic13_result_binding(value) {
    		/*dynamic13_result_binding*/ ctx[50](value);
    	}

    	let dynamic13_props = {
    		min: 15,
    		max: 25,
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	};

    	if (/*PASP*/ ctx[10] !== void 0) {
    		dynamic13_props.result = /*PASP*/ ctx[10];
    	}

    	dynamic13 = new Dynamic({ props: dynamic13_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic13, 'result', dynamic13_result_binding));

    	function dynamic14_result_binding(value) {
    		/*dynamic14_result_binding*/ ctx[51](value);
    	}

    	let dynamic14_props = {
    		min: 8,
    		max: 15,
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	};

    	if (/*PADP*/ ctx[11] !== void 0) {
    		dynamic14_props.result = /*PADP*/ ctx[11];
    	}

    	dynamic14 = new Dynamic({ props: dynamic14_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic14, 'result', dynamic14_result_binding));

    	function dynamic15_result_binding(value) {
    		/*dynamic15_result_binding*/ ctx[52](value);
    	}

    	let dynamic15_props = {
    		min: 0,
    		max: 20,
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	if (/*CVP*/ ctx[9] !== void 0) {
    		dynamic15_props.result = /*CVP*/ ctx[9];
    	}

    	dynamic15 = new Dynamic({ props: dynamic15_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic15, 'result', dynamic15_result_binding));

    	function dynamic16_result_binding(value) {
    		/*dynamic16_result_binding*/ ctx[53](value);
    	}

    	let dynamic16_props = {
    		min: 0,
    		max: 35,
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	};

    	if (/*PAWP*/ ctx[15] !== void 0) {
    		dynamic16_props.result = /*PAWP*/ ctx[15];
    	}

    	dynamic16 = new Dynamic({ props: dynamic16_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic16, 'result', dynamic16_result_binding));

    	function dynamic17_result_binding(value) {
    		/*dynamic17_result_binding*/ ctx[54](value);
    	}

    	let dynamic17_props = {
    		min: 15,
    		max: 70,
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*EF*/ ctx[23] !== void 0) {
    		dynamic17_props.result = /*EF*/ ctx[23];
    	}

    	dynamic17 = new Dynamic({ props: dynamic17_props, $$inline: true });
    	binding_callbacks.push(() => bind(dynamic17, 'result', dynamic17_result_binding));

    	const block = {
    		c: function create() {
    			main = element("main");
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Extended Cardiac Physiology";
    			t1 = space();
    			div0 = element("div");
    			create_component(calculated0.$$.fragment);
    			t2 = space();
    			create_component(calculated1.$$.fragment);
    			t3 = space();
    			create_component(calculated2.$$.fragment);
    			t4 = space();
    			create_component(calculated3.$$.fragment);
    			t5 = space();
    			create_component(calculated4.$$.fragment);
    			t6 = space();
    			create_component(calculated5.$$.fragment);
    			t7 = space();
    			create_component(calculated6.$$.fragment);
    			t8 = space();
    			create_component(calculated7.$$.fragment);
    			t9 = space();
    			create_component(calculated8.$$.fragment);
    			t10 = space();
    			create_component(calculated9.$$.fragment);
    			t11 = space();
    			create_component(calculated10.$$.fragment);
    			t12 = space();
    			create_component(calculated11.$$.fragment);
    			t13 = space();
    			create_component(calculated12.$$.fragment);
    			t14 = space();
    			create_component(calculated13.$$.fragment);
    			t15 = space();
    			create_component(calculated14.$$.fragment);
    			t16 = space();
    			create_component(calculated15.$$.fragment);
    			t17 = space();
    			div2 = element("div");
    			create_component(dynamic0.$$.fragment);
    			t18 = space();
    			create_component(dynamic1.$$.fragment);
    			t19 = space();
    			create_component(dynamic2.$$.fragment);
    			t20 = space();
    			create_component(dynamic3.$$.fragment);
    			t21 = space();
    			create_component(dynamic4.$$.fragment);
    			t22 = space();
    			create_component(dynamic5.$$.fragment);
    			t23 = space();
    			create_component(dynamic6.$$.fragment);
    			t24 = space();
    			create_component(dynamic7.$$.fragment);
    			t25 = space();
    			create_component(dynamic8.$$.fragment);
    			t26 = space();
    			create_component(dynamic9.$$.fragment);
    			t27 = space();
    			create_component(dynamic10.$$.fragment);
    			t28 = space();
    			create_component(dynamic11.$$.fragment);
    			t29 = space();
    			create_component(dynamic12.$$.fragment);
    			t30 = space();
    			create_component(dynamic13.$$.fragment);
    			t31 = space();
    			create_component(dynamic14.$$.fragment);
    			t32 = space();
    			create_component(dynamic15.$$.fragment);
    			t33 = space();
    			create_component(dynamic16.$$.fragment);
    			t34 = space();
    			create_component(dynamic17.$$.fragment);
    			add_location(h2, file, 55, 8, 1761);
    			attr_dev(div0, "class", "grid grid-cols-1 md:grid-cols-2");
    			add_location(div0, file, 56, 8, 1806);
    			attr_dev(div1, "class", "py-4 border-b md:mb-12 top border-zinc-400");
    			add_location(div1, file, 54, 6, 1696);
    			attr_dev(div2, "class", "grid grid-cols-1 mt-4 md:mt-4 md:grid-cols-2 gap-x-6 gap-y-2 bottom");
    			add_location(div2, file, 114, 6, 3548);
    			attr_dev(div3, "class", "flex flex-col w-full px-2 py-4 my-6 rounded-lg lg:p-24 lg:border-2 lg:border-solid lg:border-zinc-900 xl:max-w-6xl");
    			add_location(div3, file, 51, 4, 1550);
    			attr_dev(div4, "class", "container flex justify-center max-w-6xl align-middle");
    			add_location(div4, file, 50, 2, 1479);
    			add_location(main, file, 49, 0, 1470);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			mount_component(calculated0, div0, null);
    			append_dev(div0, t2);
    			mount_component(calculated1, div0, null);
    			append_dev(div0, t3);
    			mount_component(calculated2, div0, null);
    			append_dev(div0, t4);
    			mount_component(calculated3, div0, null);
    			append_dev(div0, t5);
    			mount_component(calculated4, div0, null);
    			append_dev(div0, t6);
    			mount_component(calculated5, div0, null);
    			append_dev(div0, t7);
    			mount_component(calculated6, div0, null);
    			append_dev(div0, t8);
    			mount_component(calculated7, div0, null);
    			append_dev(div0, t9);
    			mount_component(calculated8, div0, null);
    			append_dev(div0, t10);
    			mount_component(calculated9, div0, null);
    			append_dev(div0, t11);
    			mount_component(calculated10, div0, null);
    			append_dev(div0, t12);
    			mount_component(calculated11, div0, null);
    			append_dev(div0, t13);
    			mount_component(calculated12, div0, null);
    			append_dev(div0, t14);
    			mount_component(calculated13, div0, null);
    			append_dev(div0, t15);
    			mount_component(calculated14, div0, null);
    			append_dev(div0, t16);
    			mount_component(calculated15, div0, null);
    			append_dev(div3, t17);
    			append_dev(div3, div2);
    			mount_component(dynamic0, div2, null);
    			append_dev(div2, t18);
    			mount_component(dynamic1, div2, null);
    			append_dev(div2, t19);
    			mount_component(dynamic2, div2, null);
    			append_dev(div2, t20);
    			mount_component(dynamic3, div2, null);
    			append_dev(div2, t21);
    			mount_component(dynamic4, div2, null);
    			append_dev(div2, t22);
    			mount_component(dynamic5, div2, null);
    			append_dev(div2, t23);
    			mount_component(dynamic6, div2, null);
    			append_dev(div2, t24);
    			mount_component(dynamic7, div2, null);
    			append_dev(div2, t25);
    			mount_component(dynamic8, div2, null);
    			append_dev(div2, t26);
    			mount_component(dynamic9, div2, null);
    			append_dev(div2, t27);
    			mount_component(dynamic10, div2, null);
    			append_dev(div2, t28);
    			mount_component(dynamic11, div2, null);
    			append_dev(div2, t29);
    			mount_component(dynamic12, div2, null);
    			append_dev(div2, t30);
    			mount_component(dynamic13, div2, null);
    			append_dev(div2, t31);
    			mount_component(dynamic14, div2, null);
    			append_dev(div2, t32);
    			mount_component(dynamic15, div2, null);
    			append_dev(div2, t33);
    			mount_component(dynamic16, div2, null);
    			append_dev(div2, t34);
    			mount_component(dynamic17, div2, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const calculated0_changes = {};
    			if (dirty[0] & /*CO*/ 2) calculated0_changes.data = /*CO*/ ctx[1];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated0_changes.$$scope = { dirty, ctx };
    			}

    			calculated0.$set(calculated0_changes);
    			const calculated1_changes = {};
    			if (dirty[0] & /*CI*/ 262144) calculated1_changes.data = /*CI*/ ctx[18];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated1_changes.$$scope = { dirty, ctx };
    			}

    			calculated1.$set(calculated1_changes);
    			const calculated2_changes = {};
    			if (dirty[1] & /*CPO*/ 4) calculated2_changes.data = /*CPO*/ ctx[33];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated2_changes.$$scope = { dirty, ctx };
    			}

    			calculated2.$set(calculated2_changes);
    			const calculated3_changes = {};
    			if (dirty[0] & /*PAPI*/ 268435456) calculated3_changes.data = /*PAPI*/ ctx[28];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated3_changes.$$scope = { dirty, ctx };
    			}

    			calculated3.$set(calculated3_changes);
    			const calculated4_changes = {};
    			if (dirty[0] & /*SV*/ 4) calculated4_changes.data = /*SV*/ ctx[2];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated4_changes.$$scope = { dirty, ctx };
    			}

    			calculated4.$set(calculated4_changes);
    			const calculated5_changes = {};
    			if (dirty[0] & /*SVI*/ 131072) calculated5_changes.data = /*SVI*/ ctx[17];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated5_changes.$$scope = { dirty, ctx };
    			}

    			calculated5.$set(calculated5_changes);
    			const calculated6_changes = {};
    			if (dirty[0] & /*MAP*/ 1) calculated6_changes.data = /*MAP*/ ctx[0];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated6_changes.$$scope = { dirty, ctx };
    			}

    			calculated6.$set(calculated6_changes);
    			const calculated7_changes = {};
    			if (dirty[1] & /*SVR*/ 2) calculated7_changes.data = /*SVR*/ ctx[32];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated7_changes.$$scope = { dirty, ctx };
    			}

    			calculated7.$set(calculated7_changes);
    			const calculated8_changes = {};
    			if (dirty[1] & /*SVRI*/ 1) calculated8_changes.data = /*SVRI*/ ctx[31];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated8_changes.$$scope = { dirty, ctx };
    			}

    			calculated8.$set(calculated8_changes);
    			const calculated9_changes = {};
    			if (dirty[0] & /*MPAP*/ 65536) calculated9_changes.data = /*MPAP*/ ctx[16];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated9_changes.$$scope = { dirty, ctx };
    			}

    			calculated9.$set(calculated9_changes);
    			const calculated10_changes = {};
    			if (dirty[0] & /*PVR*/ 1073741824) calculated10_changes.data = /*PVR*/ ctx[30];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated10_changes.$$scope = { dirty, ctx };
    			}

    			calculated10.$set(calculated10_changes);
    			const calculated11_changes = {};
    			if (dirty[0] & /*PVRI*/ 536870912) calculated11_changes.data = /*PVRI*/ ctx[29];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated11_changes.$$scope = { dirty, ctx };
    			}

    			calculated11.$set(calculated11_changes);
    			const calculated12_changes = {};
    			if (dirty[0] & /*LVSW*/ 134217728) calculated12_changes.data = /*LVSW*/ ctx[27];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated12_changes.$$scope = { dirty, ctx };
    			}

    			calculated12.$set(calculated12_changes);
    			const calculated13_changes = {};
    			if (dirty[0] & /*LVSWI*/ 67108864) calculated13_changes.data = /*LVSWI*/ ctx[26];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated13_changes.$$scope = { dirty, ctx };
    			}

    			calculated13.$set(calculated13_changes);
    			const calculated14_changes = {};
    			if (dirty[0] & /*RVSW*/ 33554432) calculated14_changes.data = /*RVSW*/ ctx[25];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated14_changes.$$scope = { dirty, ctx };
    			}

    			calculated14.$set(calculated14_changes);
    			const calculated15_changes = {};
    			if (dirty[0] & /*RVSWI*/ 16777216) calculated15_changes.data = /*RVSWI*/ ctx[24];

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				calculated15_changes.$$scope = { dirty, ctx };
    			}

    			calculated15.$set(calculated15_changes);
    			const dynamic0_changes = {};

    			if (dirty[0] & /*KG*/ 2097152 | dirty[1] & /*$$scope*/ 16777216) {
    				dynamic0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result && dirty[0] & /*LB*/ 8) {
    				updating_result = true;
    				dynamic0_changes.result = /*LB*/ ctx[3];
    				add_flush_callback(() => updating_result = false);
    			}

    			dynamic0.$set(dynamic0_changes);
    			const dynamic1_changes = {};

    			if (dirty[0] & /*CM, feetRemainder, feet*/ 5767168 | dirty[1] & /*$$scope*/ 16777216) {
    				dynamic1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_1 && dirty[0] & /*inches*/ 16) {
    				updating_result_1 = true;
    				dynamic1_changes.result = /*inches*/ ctx[4];
    				add_flush_callback(() => updating_result_1 = false);
    			}

    			dynamic1.$set(dynamic1_changes);
    			const dynamic2_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic2_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_2 && dirty[0] & /*SaO2*/ 128) {
    				updating_result_2 = true;
    				dynamic2_changes.result = /*SaO2*/ ctx[7];
    				add_flush_callback(() => updating_result_2 = false);
    			}

    			dynamic2.$set(dynamic2_changes);
    			const dynamic3_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic3_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_3 && dirty[0] & /*SvO2*/ 256) {
    				updating_result_3 = true;
    				dynamic3_changes.result = /*SvO2*/ ctx[8];
    				add_flush_callback(() => updating_result_3 = false);
    			}

    			dynamic3.$set(dynamic3_changes);
    			const dynamic4_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic4_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_4 && dirty[0] & /*HGB*/ 32) {
    				updating_result_4 = true;
    				dynamic4_changes.result = /*HGB*/ ctx[5];
    				add_flush_callback(() => updating_result_4 = false);
    			}

    			dynamic4.$set(dynamic4_changes);
    			const dynamic5_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic5_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_5 && dirty[0] & /*Age*/ 64) {
    				updating_result_5 = true;
    				dynamic5_changes.result = /*Age*/ ctx[6];
    				add_flush_callback(() => updating_result_5 = false);
    			}

    			dynamic5.$set(dynamic5_changes);
    			const dynamic6_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic6_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_6 && dirty[0] & /*HR*/ 4096) {
    				updating_result_6 = true;
    				dynamic6_changes.result = /*HR*/ ctx[12];
    				add_flush_callback(() => updating_result_6 = false);
    			}

    			dynamic6.$set(dynamic6_changes);
    			const dynamic7_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic7_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_7 && dirty[0] & /*CO*/ 2) {
    				updating_result_7 = true;
    				dynamic7_changes.result = /*CO*/ ctx[1];
    				add_flush_callback(() => updating_result_7 = false);
    			}

    			dynamic7.$set(dynamic7_changes);
    			const dynamic8_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic8_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_8 && dirty[1] & /*CO2*/ 8) {
    				updating_result_8 = true;
    				dynamic8_changes.result = /*CO2*/ ctx[34];
    				add_flush_callback(() => updating_result_8 = false);
    			}

    			dynamic8.$set(dynamic8_changes);
    			const dynamic9_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic9_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_9 && dirty[0] & /*SV*/ 4) {
    				updating_result_9 = true;
    				dynamic9_changes.result = /*SV*/ ctx[2];
    				add_flush_callback(() => updating_result_9 = false);
    			}

    			dynamic9.$set(dynamic9_changes);
    			const dynamic10_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic10_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_10 && dirty[0] & /*SVI*/ 131072) {
    				updating_result_10 = true;
    				dynamic10_changes.result = /*SVI*/ ctx[17];
    				add_flush_callback(() => updating_result_10 = false);
    			}

    			dynamic10.$set(dynamic10_changes);
    			const dynamic11_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic11_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_11 && dirty[0] & /*SBP*/ 8192) {
    				updating_result_11 = true;
    				dynamic11_changes.result = /*SBP*/ ctx[13];
    				add_flush_callback(() => updating_result_11 = false);
    			}

    			dynamic11.$set(dynamic11_changes);
    			const dynamic12_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic12_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_12 && dirty[0] & /*DBP*/ 16384) {
    				updating_result_12 = true;
    				dynamic12_changes.result = /*DBP*/ ctx[14];
    				add_flush_callback(() => updating_result_12 = false);
    			}

    			dynamic12.$set(dynamic12_changes);
    			const dynamic13_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic13_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_13 && dirty[0] & /*PASP*/ 1024) {
    				updating_result_13 = true;
    				dynamic13_changes.result = /*PASP*/ ctx[10];
    				add_flush_callback(() => updating_result_13 = false);
    			}

    			dynamic13.$set(dynamic13_changes);
    			const dynamic14_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic14_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_14 && dirty[0] & /*PADP*/ 2048) {
    				updating_result_14 = true;
    				dynamic14_changes.result = /*PADP*/ ctx[11];
    				add_flush_callback(() => updating_result_14 = false);
    			}

    			dynamic14.$set(dynamic14_changes);
    			const dynamic15_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic15_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_15 && dirty[0] & /*CVP*/ 512) {
    				updating_result_15 = true;
    				dynamic15_changes.result = /*CVP*/ ctx[9];
    				add_flush_callback(() => updating_result_15 = false);
    			}

    			dynamic15.$set(dynamic15_changes);
    			const dynamic16_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic16_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_16 && dirty[0] & /*PAWP*/ 32768) {
    				updating_result_16 = true;
    				dynamic16_changes.result = /*PAWP*/ ctx[15];
    				add_flush_callback(() => updating_result_16 = false);
    			}

    			dynamic16.$set(dynamic16_changes);
    			const dynamic17_changes = {};

    			if (dirty[1] & /*$$scope*/ 16777216) {
    				dynamic17_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_result_17 && dirty[0] & /*EF*/ 8388608) {
    				updating_result_17 = true;
    				dynamic17_changes.result = /*EF*/ ctx[23];
    				add_flush_callback(() => updating_result_17 = false);
    			}

    			dynamic17.$set(dynamic17_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(calculated0.$$.fragment, local);
    			transition_in(calculated1.$$.fragment, local);
    			transition_in(calculated2.$$.fragment, local);
    			transition_in(calculated3.$$.fragment, local);
    			transition_in(calculated4.$$.fragment, local);
    			transition_in(calculated5.$$.fragment, local);
    			transition_in(calculated6.$$.fragment, local);
    			transition_in(calculated7.$$.fragment, local);
    			transition_in(calculated8.$$.fragment, local);
    			transition_in(calculated9.$$.fragment, local);
    			transition_in(calculated10.$$.fragment, local);
    			transition_in(calculated11.$$.fragment, local);
    			transition_in(calculated12.$$.fragment, local);
    			transition_in(calculated13.$$.fragment, local);
    			transition_in(calculated14.$$.fragment, local);
    			transition_in(calculated15.$$.fragment, local);
    			transition_in(dynamic0.$$.fragment, local);
    			transition_in(dynamic1.$$.fragment, local);
    			transition_in(dynamic2.$$.fragment, local);
    			transition_in(dynamic3.$$.fragment, local);
    			transition_in(dynamic4.$$.fragment, local);
    			transition_in(dynamic5.$$.fragment, local);
    			transition_in(dynamic6.$$.fragment, local);
    			transition_in(dynamic7.$$.fragment, local);
    			transition_in(dynamic8.$$.fragment, local);
    			transition_in(dynamic9.$$.fragment, local);
    			transition_in(dynamic10.$$.fragment, local);
    			transition_in(dynamic11.$$.fragment, local);
    			transition_in(dynamic12.$$.fragment, local);
    			transition_in(dynamic13.$$.fragment, local);
    			transition_in(dynamic14.$$.fragment, local);
    			transition_in(dynamic15.$$.fragment, local);
    			transition_in(dynamic16.$$.fragment, local);
    			transition_in(dynamic17.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(calculated0.$$.fragment, local);
    			transition_out(calculated1.$$.fragment, local);
    			transition_out(calculated2.$$.fragment, local);
    			transition_out(calculated3.$$.fragment, local);
    			transition_out(calculated4.$$.fragment, local);
    			transition_out(calculated5.$$.fragment, local);
    			transition_out(calculated6.$$.fragment, local);
    			transition_out(calculated7.$$.fragment, local);
    			transition_out(calculated8.$$.fragment, local);
    			transition_out(calculated9.$$.fragment, local);
    			transition_out(calculated10.$$.fragment, local);
    			transition_out(calculated11.$$.fragment, local);
    			transition_out(calculated12.$$.fragment, local);
    			transition_out(calculated13.$$.fragment, local);
    			transition_out(calculated14.$$.fragment, local);
    			transition_out(calculated15.$$.fragment, local);
    			transition_out(dynamic0.$$.fragment, local);
    			transition_out(dynamic1.$$.fragment, local);
    			transition_out(dynamic2.$$.fragment, local);
    			transition_out(dynamic3.$$.fragment, local);
    			transition_out(dynamic4.$$.fragment, local);
    			transition_out(dynamic5.$$.fragment, local);
    			transition_out(dynamic6.$$.fragment, local);
    			transition_out(dynamic7.$$.fragment, local);
    			transition_out(dynamic8.$$.fragment, local);
    			transition_out(dynamic9.$$.fragment, local);
    			transition_out(dynamic10.$$.fragment, local);
    			transition_out(dynamic11.$$.fragment, local);
    			transition_out(dynamic12.$$.fragment, local);
    			transition_out(dynamic13.$$.fragment, local);
    			transition_out(dynamic14.$$.fragment, local);
    			transition_out(dynamic15.$$.fragment, local);
    			transition_out(dynamic16.$$.fragment, local);
    			transition_out(dynamic17.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(calculated0);
    			destroy_component(calculated1);
    			destroy_component(calculated2);
    			destroy_component(calculated3);
    			destroy_component(calculated4);
    			destroy_component(calculated5);
    			destroy_component(calculated6);
    			destroy_component(calculated7);
    			destroy_component(calculated8);
    			destroy_component(calculated9);
    			destroy_component(calculated10);
    			destroy_component(calculated11);
    			destroy_component(calculated12);
    			destroy_component(calculated13);
    			destroy_component(calculated14);
    			destroy_component(calculated15);
    			destroy_component(dynamic0);
    			destroy_component(dynamic1);
    			destroy_component(dynamic2);
    			destroy_component(dynamic3);
    			destroy_component(dynamic4);
    			destroy_component(dynamic5);
    			destroy_component(dynamic6);
    			destroy_component(dynamic7);
    			destroy_component(dynamic8);
    			destroy_component(dynamic9);
    			destroy_component(dynamic10);
    			destroy_component(dynamic11);
    			destroy_component(dynamic12);
    			destroy_component(dynamic13);
    			destroy_component(dynamic14);
    			destroy_component(dynamic15);
    			destroy_component(dynamic16);
    			destroy_component(dynamic17);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let CO2;
    	let CPO;
    	let CI;
    	let SVR;
    	let SVRI;
    	let PVR;
    	let PVRI;
    	let MPAP;
    	let PAPI;
    	let SVI;
    	let LVSW;
    	let LVSWI;
    	let RVSW;
    	let RVSWI;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let VO2, BSA, MAP, feet, CM, KG, feetRemainder, CO, SV;

    	let LB = 140,
    		inches = 70,
    		HGB = 14,
    		Age = 70,
    		SaO2 = 100,
    		SvO2 = 70,
    		CVP = 6,
    		PASP = 18,
    		PADP = 10,
    		HR = 80,
    		SBP = 120,
    		DBP = 80,
    		EF = 55,
    		PAWP = 10;

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function dynamic0_result_binding(value) {
    		LB = value;
    		$$invalidate(3, LB);
    	}

    	function dynamic1_result_binding(value) {
    		inches = value;
    		$$invalidate(4, inches);
    	}

    	function dynamic2_result_binding(value) {
    		SaO2 = value;
    		$$invalidate(7, SaO2);
    	}

    	function dynamic3_result_binding(value) {
    		SvO2 = value;
    		$$invalidate(8, SvO2);
    	}

    	function dynamic4_result_binding(value) {
    		HGB = value;
    		$$invalidate(5, HGB);
    	}

    	function dynamic5_result_binding(value) {
    		Age = value;
    		$$invalidate(6, Age);
    	}

    	function dynamic6_result_binding(value) {
    		HR = value;
    		$$invalidate(12, HR);
    	}

    	function dynamic7_result_binding(value) {
    		CO = value;
    		(((((((($$invalidate(1, CO), $$invalidate(35, VO2)), $$invalidate(7, SaO2)), $$invalidate(8, SvO2)), $$invalidate(5, HGB)), $$invalidate(6, Age)), $$invalidate(36, BSA)), $$invalidate(4, inches)), $$invalidate(3, LB));
    	}

    	function dynamic8_result_binding(value) {
    		CO2 = value;
    		((((((((((($$invalidate(34, CO2), $$invalidate(12, HR)), $$invalidate(2, SV)), $$invalidate(1, CO)), $$invalidate(35, VO2)), $$invalidate(7, SaO2)), $$invalidate(8, SvO2)), $$invalidate(5, HGB)), $$invalidate(6, Age)), $$invalidate(36, BSA)), $$invalidate(4, inches)), $$invalidate(3, LB));
    	}

    	function dynamic9_result_binding(value) {
    		SV = value;
    		(((((((((($$invalidate(2, SV), $$invalidate(1, CO)), $$invalidate(12, HR)), $$invalidate(35, VO2)), $$invalidate(7, SaO2)), $$invalidate(8, SvO2)), $$invalidate(5, HGB)), $$invalidate(6, Age)), $$invalidate(36, BSA)), $$invalidate(4, inches)), $$invalidate(3, LB));
    	}

    	function dynamic10_result_binding(value) {
    		SVI = value;
    		((((((((((($$invalidate(17, SVI), $$invalidate(18, CI)), $$invalidate(12, HR)), $$invalidate(1, CO)), $$invalidate(36, BSA)), $$invalidate(35, VO2)), $$invalidate(7, SaO2)), $$invalidate(8, SvO2)), $$invalidate(5, HGB)), $$invalidate(4, inches)), $$invalidate(3, LB)), $$invalidate(6, Age));
    	}

    	function dynamic11_result_binding(value) {
    		SBP = value;
    		$$invalidate(13, SBP);
    	}

    	function dynamic12_result_binding(value) {
    		DBP = value;
    		$$invalidate(14, DBP);
    	}

    	function dynamic13_result_binding(value) {
    		PASP = value;
    		$$invalidate(10, PASP);
    	}

    	function dynamic14_result_binding(value) {
    		PADP = value;
    		$$invalidate(11, PADP);
    	}

    	function dynamic15_result_binding(value) {
    		CVP = value;
    		$$invalidate(9, CVP);
    	}

    	function dynamic16_result_binding(value) {
    		PAWP = value;
    		$$invalidate(15, PAWP);
    	}

    	function dynamic17_result_binding(value) {
    		EF = value;
    		$$invalidate(23, EF);
    	}

    	$$self.$capture_state = () => ({
    		Dynamic,
    		Calculated,
    		VO2,
    		BSA,
    		MAP,
    		feet,
    		CM,
    		KG,
    		feetRemainder,
    		CO,
    		SV,
    		LB,
    		inches,
    		HGB,
    		Age,
    		SaO2,
    		SvO2,
    		CVP,
    		PASP,
    		PADP,
    		HR,
    		SBP,
    		DBP,
    		EF,
    		PAWP,
    		MPAP,
    		SVI,
    		RVSWI,
    		RVSW,
    		LVSWI,
    		LVSW,
    		CI,
    		PAPI,
    		PVRI,
    		PVR,
    		SVRI,
    		SVR,
    		CPO,
    		CO2
    	});

    	$$self.$inject_state = $$props => {
    		if ('VO2' in $$props) $$invalidate(35, VO2 = $$props.VO2);
    		if ('BSA' in $$props) $$invalidate(36, BSA = $$props.BSA);
    		if ('MAP' in $$props) $$invalidate(0, MAP = $$props.MAP);
    		if ('feet' in $$props) $$invalidate(19, feet = $$props.feet);
    		if ('CM' in $$props) $$invalidate(20, CM = $$props.CM);
    		if ('KG' in $$props) $$invalidate(21, KG = $$props.KG);
    		if ('feetRemainder' in $$props) $$invalidate(22, feetRemainder = $$props.feetRemainder);
    		if ('CO' in $$props) $$invalidate(1, CO = $$props.CO);
    		if ('SV' in $$props) $$invalidate(2, SV = $$props.SV);
    		if ('LB' in $$props) $$invalidate(3, LB = $$props.LB);
    		if ('inches' in $$props) $$invalidate(4, inches = $$props.inches);
    		if ('HGB' in $$props) $$invalidate(5, HGB = $$props.HGB);
    		if ('Age' in $$props) $$invalidate(6, Age = $$props.Age);
    		if ('SaO2' in $$props) $$invalidate(7, SaO2 = $$props.SaO2);
    		if ('SvO2' in $$props) $$invalidate(8, SvO2 = $$props.SvO2);
    		if ('CVP' in $$props) $$invalidate(9, CVP = $$props.CVP);
    		if ('PASP' in $$props) $$invalidate(10, PASP = $$props.PASP);
    		if ('PADP' in $$props) $$invalidate(11, PADP = $$props.PADP);
    		if ('HR' in $$props) $$invalidate(12, HR = $$props.HR);
    		if ('SBP' in $$props) $$invalidate(13, SBP = $$props.SBP);
    		if ('DBP' in $$props) $$invalidate(14, DBP = $$props.DBP);
    		if ('EF' in $$props) $$invalidate(23, EF = $$props.EF);
    		if ('PAWP' in $$props) $$invalidate(15, PAWP = $$props.PAWP);
    		if ('MPAP' in $$props) $$invalidate(16, MPAP = $$props.MPAP);
    		if ('SVI' in $$props) $$invalidate(17, SVI = $$props.SVI);
    		if ('RVSWI' in $$props) $$invalidate(24, RVSWI = $$props.RVSWI);
    		if ('RVSW' in $$props) $$invalidate(25, RVSW = $$props.RVSW);
    		if ('LVSWI' in $$props) $$invalidate(26, LVSWI = $$props.LVSWI);
    		if ('LVSW' in $$props) $$invalidate(27, LVSW = $$props.LVSW);
    		if ('CI' in $$props) $$invalidate(18, CI = $$props.CI);
    		if ('PAPI' in $$props) $$invalidate(28, PAPI = $$props.PAPI);
    		if ('PVRI' in $$props) $$invalidate(29, PVRI = $$props.PVRI);
    		if ('PVR' in $$props) $$invalidate(30, PVR = $$props.PVR);
    		if ('SVRI' in $$props) $$invalidate(31, SVRI = $$props.SVRI);
    		if ('SVR' in $$props) $$invalidate(32, SVR = $$props.SVR);
    		if ('CPO' in $$props) $$invalidate(33, CPO = $$props.CPO);
    		if ('CO2' in $$props) $$invalidate(34, CO2 = $$props.CO2);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*inches*/ 16) {
    			$$invalidate(19, feet = inches / 12); // Converts inches to feet
    		}

    		if ($$self.$$.dirty[0] & /*inches*/ 16) {
    			$$invalidate(20, CM = inches * 2.54); // Converts inches to cm
    		}

    		if ($$self.$$.dirty[0] & /*LB*/ 8) {
    			$$invalidate(21, KG = LB * 0.45359237); // Converts lbs to kg
    		}

    		if ($$self.$$.dirty[0] & /*inches*/ 16) {
    			$$invalidate(22, feetRemainder = inches % 12); // for height, remainder inches
    		}

    		if ($$self.$$.dirty[0] & /*inches, LB*/ 24) {
    			$$invalidate(36, BSA = Math.sqrt(inches * 2.54 * LB * 0.45359237 / 3600)); // BSA based on height/weight
    		}

    		if ($$self.$$.dirty[0] & /*Age*/ 64 | $$self.$$.dirty[1] & /*BSA*/ 32) {
    			Age >= 70
    			? $$invalidate(35, VO2 = 110 * BSA)
    			: $$invalidate(35, VO2 = 125 * BSA); // O2 delivery based on age and BSA
    		}

    		if ($$self.$$.dirty[0] & /*SaO2, SvO2, HGB*/ 416 | $$self.$$.dirty[1] & /*VO2*/ 16) {
    			$$invalidate(1, CO = VO2 / ((SaO2 - SvO2) / 100 * HGB * 13.4)); // Cardiac Output
    		}

    		if ($$self.$$.dirty[0] & /*CO, HR*/ 4098) {
    			$$invalidate(2, SV = CO / HR * 1000);
    		}

    		if ($$self.$$.dirty[0] & /*HR, SV*/ 4100) {
    			$$invalidate(34, CO2 = HR * SV / 1000); // Cardiac output from SV
    		}

    		if ($$self.$$.dirty[0] & /*SBP, DBP*/ 24576) {
    			$$invalidate(0, MAP = (SBP + 2 * DBP) / 3);
    		}

    		if ($$self.$$.dirty[0] & /*MAP, CO*/ 3) {
    			$$invalidate(33, CPO = MAP * CO / 451); // Cardiac Power Output
    		}

    		if ($$self.$$.dirty[0] & /*CO*/ 2 | $$self.$$.dirty[1] & /*BSA*/ 32) {
    			$$invalidate(18, CI = CO / BSA); // Cardiac Index
    		}

    		if ($$self.$$.dirty[0] & /*MAP, CVP, CO*/ 515) {
    			$$invalidate(32, SVR = 80 * (MAP - CVP) / CO);
    		}

    		if ($$self.$$.dirty[0] & /*MAP, CVP, CI*/ 262657) {
    			$$invalidate(31, SVRI = 80 * (MAP - CVP) / CI);
    		}

    		if ($$self.$$.dirty[0] & /*PASP, PADP*/ 3072) {
    			$$invalidate(16, MPAP = (PASP + 2 * PADP) / 3);
    		}

    		if ($$self.$$.dirty[0] & /*MPAP, PAWP, CO*/ 98306) {
    			$$invalidate(30, PVR = 80 * (MPAP - PAWP) / CO);
    		}

    		if ($$self.$$.dirty[0] & /*MPAP, PAWP, CI*/ 360448) {
    			$$invalidate(29, PVRI = 80 * (MPAP - PAWP) / CI);
    		}

    		if ($$self.$$.dirty[0] & /*PASP, PADP, CVP*/ 3584) {
    			$$invalidate(28, PAPI = (PASP - PADP) / CVP);
    		}

    		if ($$self.$$.dirty[0] & /*CI, HR*/ 266240) {
    			$$invalidate(17, SVI = CI / HR * 1000);
    		}

    		if ($$self.$$.dirty[0] & /*SV, MAP, PAWP*/ 32773) {
    			$$invalidate(27, LVSW = SV * (MAP - PAWP) * 0.0136);
    		}

    		if ($$self.$$.dirty[0] & /*SVI, MAP, PAWP*/ 163841) {
    			$$invalidate(26, LVSWI = SVI * (MAP - PAWP) * 0.0136);
    		}

    		if ($$self.$$.dirty[0] & /*SV, MPAP, CVP*/ 66052) {
    			$$invalidate(25, RVSW = SV * (MPAP - CVP) * 0.0136);
    		}

    		if ($$self.$$.dirty[0] & /*SVI, MPAP, CVP*/ 197120) {
    			$$invalidate(24, RVSWI = SVI * (MPAP - CVP) * 0.0136);
    		}
    	};

    	return [
    		MAP,
    		CO,
    		SV,
    		LB,
    		inches,
    		HGB,
    		Age,
    		SaO2,
    		SvO2,
    		CVP,
    		PASP,
    		PADP,
    		HR,
    		SBP,
    		DBP,
    		PAWP,
    		MPAP,
    		SVI,
    		CI,
    		feet,
    		CM,
    		KG,
    		feetRemainder,
    		EF,
    		RVSWI,
    		RVSW,
    		LVSWI,
    		LVSW,
    		PAPI,
    		PVRI,
    		PVR,
    		SVRI,
    		SVR,
    		CPO,
    		CO2,
    		VO2,
    		BSA,
    		dynamic0_result_binding,
    		dynamic1_result_binding,
    		dynamic2_result_binding,
    		dynamic3_result_binding,
    		dynamic4_result_binding,
    		dynamic5_result_binding,
    		dynamic6_result_binding,
    		dynamic7_result_binding,
    		dynamic8_result_binding,
    		dynamic9_result_binding,
    		dynamic10_result_binding,
    		dynamic11_result_binding,
    		dynamic12_result_binding,
    		dynamic13_result_binding,
    		dynamic14_result_binding,
    		dynamic15_result_binding,
    		dynamic16_result_binding,
    		dynamic17_result_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
