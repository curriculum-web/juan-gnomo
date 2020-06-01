var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function empty() {
        return text('');
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src/Back.svelte generated by Svelte v3.23.0 */

    function create_fragment(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			div.innerHTML = `<i class="fas fa-arrow-left svelte-1a10gd7"></i>`;
    			attr(div, "class", "tabs svelte-1a10gd7");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (!mounted) {
    				dispose = listen(div, "click", /*click_handler*/ ctx[0]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance($$self) {
    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	return [click_handler];
    }

    class Back extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const programacion = [
     
      {"title": "Book-List",
       "description": "Aplicación con Local Storage realizada en Html, Bootstrap y JavaScript",
       "url": "https://enzodaneri.github.io/book-list/"
      }, 
      {"title": "HandsWash-App",
      "description": "Aplicación para lavado de manos por covid-19",
      "url": "https://enzodaneri.github.io/hands-washing/"
      }, 
      {"title": "Budget Estimator",
      "description": "Estimador de Presupuesto",
      "url": "https://enzodaneri.github.io/project-estimator/"
      },
      
      {"title": "Lista de Tareas",
       "description": "Crud realizado en Html, Css y JavaScript",
       "url": "https://enzodaneri.github.io/todo-list/"
      },
      {"title": "Filter List",
       "description": "Lista filtrable realizada en Html, Materialize y JavaScript",
       "url": "https://enzodaneri.github.io/lista--filtrable/"
      },
      {"title": "Crud Products",
       "description": "Aplicación crud realizada en Html, Bootstrap y JavaScript",
       "url": "https://enzodaneri.github.io/crud-products/"
      },
      {"title": "Landing Page",
       "description": "Landing Page realizada en Html, Css y JavaScript",
       "url": "https://enzodaneri.github.io/landing2/"
      },
      {"title": "App de Tareas",
       "description": "App de tareas realizada en Html, Bootstrap y JavaScript",
       "url": " https://enzodaneri.github.io/app-tareas/"
      },
      {"title": "Galería de Imágenes",
       "description": "Componente de UI realizado en Html, Css y JavaScript",
       "url": "https://enzodaneri.github.io/galer-a-imgs/"
      },
      {"title": "Card User Neumórfica",
      "description": "Componente de UI realizado en Html, Css y JavaScript",
      "url": "https://enzodaneri.github.io/card-user-neumorphism/"
      },
      {"title": "Botón Check Out Neumórfico",
      "description": "Componente de UI realizado en Html y Css",
      "url": "https://enzodaneri.github.io/Neumorphism-Button/"
      },
      {"title": "Slider con cuadro de texto",
      "description": "Componente de UI realizado en Html, Css y Javascript",
      "url": "https://enzodaneri.github.io/slider/"
      }

    ];

    /* src/Programacion.svelte generated by Svelte v3.23.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	child_ctx[4] = i;
    	return child_ctx;
    }

    // (28:6) {:else}
    function create_else_block(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Ocultar";
    			attr(div, "class", "btn svelte-vjs7yy");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (!mounted) {
    				dispose = listen(div, "click", /*showPortfolio*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (26:6) {#if portfolio == false}
    function create_if_block_1(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Portfolio";
    			attr(div, "class", "btn svelte-vjs7yy");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (!mounted) {
    				dispose = listen(div, "click", /*showPortfolio*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (35:0) {#if portfolio == true}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = programacion;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*programacion*/ 0) {
    				each_value = programacion;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i(local) {
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}
    		},
    		o: noop,
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (37:0) {#each programacion as project, index}
    function create_each_block(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let a;
    	let div0;
    	let a_href_value;
    	let t1;
    	let p;
    	let t2_value = /*project*/ ctx[2].title + "";
    	let t2;
    	let div2_class_value;
    	let t3;
    	let div3_intro;

    	return {
    		c() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			a = element("a");
    			div0 = element("div");
    			div0.textContent = "Ver";
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			attr(div0, "class", "verLink svelte-vjs7yy");
    			attr(a, "href", a_href_value = /*project*/ ctx[2].url);
    			attr(a, "class", "svelte-vjs7yy");
    			attr(div1, "class", "card-content");
    			attr(p, "class", "svelte-vjs7yy");
    			attr(div2, "class", div2_class_value = "" + (null_to_empty(/*index*/ ctx[4] % 2 == 0 ? "card" : "cardDos") + " svelte-vjs7yy"));
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div2);
    			append(div2, div1);
    			append(div1, a);
    			append(a, div0);
    			append(div2, t1);
    			append(div2, p);
    			append(p, t2);
    			append(div3, t3);
    		},
    		p: noop,
    		i(local) {
    			if (!div3_intro) {
    				add_render_callback(() => {
    					div3_intro = create_in_transition(div3, fade, {});
    					div3_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div3);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let div3;
    	let h1;
    	let t2;
    	let div2;
    	let div1;
    	let i0;
    	let t3;
    	let p;
    	let t5;
    	let div0;
    	let t8;
    	let t9;
    	let div3_intro;

    	function select_block_type(ctx, dirty) {
    		if (/*portfolio*/ ctx[0] == false) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*portfolio*/ ctx[0] == true && create_if_block(ctx);

    	return {
    		c() {
    			div3 = element("div");
    			h1 = element("h1");
    			h1.innerHTML = `Protección de <span class="svelte-vjs7yy">Jardines</span>`;
    			t2 = space();
    			div2 = element("div");
    			div1 = element("div");
    			i0 = element("i");
    			t3 = space();
    			p = element("p");
    			p.textContent = "Pongo toda mi magia al servicio de tu hogar";
    			t5 = space();
    			div0 = element("div");

    			div0.innerHTML = `<a href="https://github.com/EnzoDaneri" target="blank" class="svelte-vjs7yy"><i class="fab fa-github svelte-vjs7yy"></i></a> 
     <a href="https://wa.me/542392462524/?text=Hola!%20vi%20tu%20web%20" class="svelte-vjs7yy"><i class="fab fa-whatsapp svelte-vjs7yy"></i></a> 
     <a href="https://www.linkedin.com/in/enzo-adri%C3%A1n-daneri-desarrollo-web/" target="blank" class="svelte-vjs7yy"><i class="fab fa-linkedin-in svelte-vjs7yy"></i></a>`;

    			t8 = space();
    			if_block0.c();
    			t9 = space();
    			if (if_block1) if_block1.c();
    			attr(h1, "class", "svelte-vjs7yy");
    			attr(i0, "class", "fas fa-hat-wizard svelte-vjs7yy");
    			attr(p, "class", "svelte-vjs7yy");
    			attr(div0, "class", "icons svelte-vjs7yy");
    			attr(div1, "class", "card-content");
    			attr(div2, "class", "cardTres svelte-vjs7yy");
    			attr(div3, "class", "container svelte-vjs7yy");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, h1);
    			append(div3, t2);
    			append(div3, div2);
    			append(div2, div1);
    			append(div1, i0);
    			append(div1, t3);
    			append(div1, p);
    			append(div1, t5);
    			append(div1, div0);
    			append(div1, t8);
    			if_block0.m(div1, null);
    			append(div3, t9);
    			if (if_block1) if_block1.m(div3, null);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div1, null);
    				}
    			}

    			if (/*portfolio*/ ctx[0] == true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*portfolio*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div3, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i(local) {
    			transition_in(if_block1);

    			if (!div3_intro) {
    				add_render_callback(() => {
    					div3_intro = create_in_transition(div3, fly, { x: -300, duration: 600 });
    					div3_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div3);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let portfolio = false;

    	const showPortfolio = () => {
    		$$invalidate(0, portfolio = !portfolio);
    	};

    	return [portfolio, showPortfolio];
    }

    class Programacion extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src/Comprar.svelte generated by Svelte v3.23.0 */

    function create_fragment$2(ctx) {
    	let div3;

    	return {
    		c() {
    			div3 = element("div");

    			div3.innerHTML = `<div class="card svelte-kpw06z"><div class="card-content"><i class="fas fa-shopping-cart svelte-kpw06z"></i> 
<p> USD 30 (1 month)</p> 

<i class="fab fa-paypal svelte-kpw06z"></i> 

<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top"><input type="hidden" name="cmd" value="_s-xclick"> 
<input type="hidden" name="hosted_button_id" value="M3G6RAMJK9LZW"> 
<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_buynowCC_LG.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!"> 
<img alt="" border="0" src="https://www.paypalobjects.com/es_XC/i/scr/pixel.gif" width="1" height="1"></form></div></div> 
<p class="gracias svelte-kpw06z">Por favor, completa el pago en PayPal y contáctame</p> 
   <div class="icons svelte-kpw06z"><a href="https://www.instagram.com/danerienzo/" target="blank"><i class="fab fa-instagram svelte-kpw06z"></i></a> 
     <a href="https://wa.me/542392462524/?text=Hola!.%20Quiero%20contratar%custodia%20de%20tesoros%20"><i class="fab fa-whatsapp svelte-kpw06z"></i></a> 
     <a href="https://www.facebook.com/enzodaneri" target="blank"><i class="fab fa-facebook-f svelte-kpw06z"></i></a></div> 
<p class="graciasDos svelte-kpw06z">Thank You...</p>`;

    			attr(div3, "class", "container svelte-kpw06z");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div3);
    		}
    	};
    }

    class Comprar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* src/Compania.svelte generated by Svelte v3.23.0 */

    function create_if_block_1$1(ctx) {
    	let div3;
    	let h1;
    	let t2;
    	let div2;
    	let div1;
    	let i0;
    	let t3;
    	let p0;
    	let t5;
    	let i1;
    	let t6;
    	let p1;
    	let t8;
    	let div0;
    	let div3_intro;
    	let t10;
    	let current;
    	let mounted;
    	let dispose;
    	const back = new Back({});
    	back.$on("click", /*click_handler*/ ctx[2]);

    	return {
    		c() {
    			div3 = element("div");
    			h1 = element("h1");
    			h1.innerHTML = `<span class="svelte-1qp4h06">Cuidado de</span> Tesoros`;
    			t2 = space();
    			div2 = element("div");
    			div1 = element("div");
    			i0 = element("i");
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Custodia de Tesoros subterráneos.";
    			t5 = space();
    			i1 = element("i");
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "Para cualquier lugar del mundo";
    			t8 = space();
    			div0 = element("div");
    			div0.textContent = "Comprar";
    			t10 = space();
    			create_component(back.$$.fragment);
    			attr(h1, "class", "svelte-1qp4h06");
    			attr(i0, "class", "far fa-gem svelte-1qp4h06");
    			attr(p0, "class", "svelte-1qp4h06");
    			attr(i1, "class", "fas fa-globe-americas svelte-1qp4h06");
    			attr(p1, "class", "svelte-1qp4h06");
    			attr(div0, "class", "btn svelte-1qp4h06");
    			attr(div1, "class", "card-content");
    			attr(div2, "class", "card svelte-1qp4h06");
    			attr(div3, "class", "container svelte-1qp4h06");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, h1);
    			append(div3, t2);
    			append(div3, div2);
    			append(div2, div1);
    			append(div1, i0);
    			append(div1, t3);
    			append(div1, p0);
    			append(div1, t5);
    			append(div1, i1);
    			append(div1, t6);
    			append(div1, p1);
    			append(div1, t8);
    			append(div1, div0);
    			insert(target, t10, anchor);
    			mount_component(back, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen(div0, "click", /*showComprar*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i(local) {
    			if (current) return;

    			if (!div3_intro) {
    				add_render_callback(() => {
    					div3_intro = create_in_transition(div3, fly, { x: -300, duration: 600 });
    					div3_intro.start();
    				});
    			}

    			transition_in(back.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(back.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			if (detaching) detach(t10);
    			destroy_component(back, detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (36:0) {#if comprar == true}
    function create_if_block$1(ctx) {
    	let t;
    	let current;
    	const comprar_1 = new Comprar({});
    	const back = new Back({});
    	back.$on("click", /*showComprar*/ ctx[1]);

    	return {
    		c() {
    			create_component(comprar_1.$$.fragment);
    			t = space();
    			create_component(back.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(comprar_1, target, anchor);
    			insert(target, t, anchor);
    			mount_component(back, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(comprar_1.$$.fragment, local);
    			transition_in(back.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(comprar_1.$$.fragment, local);
    			transition_out(back.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(comprar_1, detaching);
    			if (detaching) detach(t);
    			destroy_component(back, detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let t;
    	let if_block1_anchor;
    	let current;
    	let if_block0 = /*comprar*/ ctx[0] == false && create_if_block_1$1(ctx);
    	let if_block1 = /*comprar*/ ctx[0] == true && create_if_block$1(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*comprar*/ ctx[0] == false) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*comprar*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*comprar*/ ctx[0] == true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*comprar*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(if_block1_anchor);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let comprar = false;

    	const showComprar = () => {
    		$$invalidate(0, comprar = !comprar);
    	};

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	return [comprar, showComprar, click_handler];
    }

    class Compania extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* src/Tips.svelte generated by Svelte v3.23.0 */

    function create_fragment$4(ctx) {
    	let div0;
    	let t0;
    	let div5;
    	let div5_intro;

    	return {
    		c() {
    			div0 = element("div");
    			div0.innerHTML = `<i class="fas fa-check svelte-1c9y35s"></i>`;
    			t0 = space();
    			div5 = element("div");

    			div5.innerHTML = `<div class="tipUno svelte-1c9y35s"><p> La Puntualidad siempre es una hermosa virtud ... practícala! </p></div> 

<div class="tipDos svelte-1c9y35s"><p>  La Discreción te aporta valor y es apreciada por muchas personas... </p></div> 

<div class="tipUno svelte-1c9y35s"><p> Siempre pensá a largo plazo. Ganá una buena reputación y esmerate para mantenerla... </p></div> 

<div class="tipDos svelte-1c9y35s"><p> Cada día se aprende algo. Mantenete siempre actualizado. </p></div>`;

    			attr(div0, "class", "icon svelte-1c9y35s");
    			attr(div5, "class", "containerTips svelte-1c9y35s");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			insert(target, t0, anchor);
    			insert(target, div5, anchor);
    		},
    		p: noop,
    		i(local) {
    			if (!div5_intro) {
    				add_render_callback(() => {
    					div5_intro = create_in_transition(div5, fly, { x: -300, duration: 600 });
    					div5_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div0);
    			if (detaching) detach(t0);
    			if (detaching) detach(div5);
    		}
    	};
    }

    class Tips extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$4, safe_not_equal, {});
    	}
    }

    /* src/Contacto.svelte generated by Svelte v3.23.0 */

    function create_fragment$5(ctx) {
    	let div4;
    	let div4_intro;

    	return {
    		c() {
    			div4 = element("div");

    			div4.innerHTML = `<div class="card svelte-nxnn2"><div class="card-content"><img src="./img/gnomo.png" alt="Foto de Juan Gnomo" class="svelte-nxnn2"> 
<h1 class="svelte-nxnn2"><span class="svelte-nxnn2">Juan</span> Gnomo</h1> 
<p class="phone svelte-nxnn2">Argentina. Bosque Encantado. Buenos Aires</p> 
<p class="phone svelte-nxnn2"><i class="fas fa-phone-alt"></i>  <span class="svelte-nxnn2">+54 2392 15 462524</span></p> 
     <div class="icons svelte-nxnn2"><a href="https://github.com/EnzoDaneri" target="blank"><i class="fab fa-github svelte-nxnn2"></i></a> 
     <a href="https://wa.me/542392462524/?text=Hola!.%20Vi%20tu%20perfil%20"><i class="fab fa-whatsapp svelte-nxnn2"></i></a> 
     <a href="https://www.linkedin.com/in/enzo-adri%C3%A1n-daneri-desarrollo-web/" target="blank"><i class="fab fa-linkedin-in svelte-nxnn2"></i></a> 
     <a href="https://www.facebook.com/enzodaneri" target="blank"><i class="fab fa-facebook-f svelte-nxnn2"></i></a> 
     <a href="https://www.instagram.com/danerienzo/" target="blank"><i class="fab fa-instagram svelte-nxnn2"></i></a></div> 
<div class="curriculum svelte-nxnn2"><a href="curriculum-juan-gnomo.pdf" target="blank" class="svelte-nxnn2"><p><i class="far fa-address-card svelte-nxnn2"></i>   Mi C.V</p></a></div></div></div>`;

    			attr(div4, "class", "container svelte-nxnn2");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    		},
    		p: noop,
    		i(local) {
    			if (!div4_intro) {
    				add_render_callback(() => {
    					div4_intro = create_in_transition(div4, fly, { x: -300, duration: 600 });
    					div4_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div4);
    		}
    	};
    }

    class Contacto extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$5, safe_not_equal, {});
    	}
    }

    /* src/Info.svelte generated by Svelte v3.23.0 */

    function create_fragment$6(ctx) {
    	let div8;
    	let div8_intro;

    	return {
    		c() {
    			div8 = element("div");

    			div8.innerHTML = `<h1 class="svelte-tsd87r">Info</h1> 
<h2 class="svelte-tsd87r"><span class="svelte-tsd87r">Cuidado de</span> Tesoros</h2> 


<div class="card svelte-tsd87r"><div class="card-content"><p>La custodia de tesoros se realiza con estrictos protocolos de seguridad mágica.</p></div></div> 

<div class="cardDos svelte-tsd87r"><div class="card-content"><p>Amplio conocimiento del bosque y todos sus recovecos</p></div></div> 


<div class="card svelte-tsd87r"><div class="card-content"><p>Por USD 30 tienes la custodia durante 1 mes </p></div></div> 


<div class="cardDos svelte-tsd87r"><div class="card-content"><p>La frecuencia será a convenir</p></div></div>`;

    			attr(div8, "class", "container svelte-tsd87r");
    		},
    		m(target, anchor) {
    			insert(target, div8, anchor);
    		},
    		p: noop,
    		i(local) {
    			if (!div8_intro) {
    				add_render_callback(() => {
    					div8_intro = create_in_transition(div8, fly, { x: -300, duration: 600 });
    					div8_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div8);
    		}
    	};
    }

    class Info extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$6, safe_not_equal, {});
    	}
    }

    /* src/ContentManager.svelte generated by Svelte v3.23.0 */

    function create_fragment$7(ctx) {
    	let div4;
    	let div4_intro;

    	return {
    		c() {
    			div4 = element("div");

    			div4.innerHTML = `<h1 class="svelte-1p7bfwx">Travesuras en gral.</h1> 


<div class="card svelte-1p7bfwx"><div class="card-content"><i class="fas fa-candy-cane svelte-1p7bfwx"></i> 
<p class="svelte-1p7bfwx"> Todo tipo de travesuras para particulares y empresas</p> 
    <div class="icons svelte-1p7bfwx"><a href="https://github.com/EnzoDaneri" target="blank" class="svelte-1p7bfwx"><i class="fab fa-github svelte-1p7bfwx"></i></a> 
     <a href="https://www.linkedin.com/in/enzo-adri%C3%A1n-daneri-desarrollo-web/" target="blank" class="svelte-1p7bfwx"><i class="fab fa-linkedin-in svelte-1p7bfwx"></i></a> 
     <a href="https://www.facebook.com/enzodaneri" target="blank" class="svelte-1p7bfwx"><i class="fab fa-facebook-f svelte-1p7bfwx"></i></a> 
     <a href="https://www.instagram.com/danerienzo/" target="blank" class="svelte-1p7bfwx"><i class="fab fa-instagram svelte-1p7bfwx"></i></a></div></div></div> 

    <a href="https://wa.me/542392462524/?text=Hola!.%20" class="svelte-1p7bfwx"><div class="btn svelte-1p7bfwx">Contactar</div></a>`;

    			attr(div4, "class", "container svelte-1p7bfwx");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    		},
    		p: noop,
    		i(local) {
    			if (!div4_intro) {
    				add_render_callback(() => {
    					div4_intro = create_in_transition(div4, fly, { x: -300, duration: 600 });
    					div4_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div4);
    		}
    	};
    }

    class ContentManager extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$7, safe_not_equal, {});
    	}
    }

    /* src/App.svelte generated by Svelte v3.23.0 */

    function create_if_block_6(ctx) {
    	let div5;
    	let div0;
    	let t0;
    	let h1;
    	let t3;
    	let h2;
    	let t5;
    	let div1;
    	let t7;
    	let div2;
    	let t9;
    	let div3;
    	let t11;
    	let footer;
    	let div4;
    	let span1;
    	let t13;
    	let span2;
    	let t15;
    	let span3;
    	let div5_intro;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div5 = element("div");
    			div0 = element("div");
    			div0.innerHTML = `<img src="./img/gnomo.png" alt="Foto de Enzo Daneri" class="svelte-1vdy5np">`;
    			t0 = space();
    			h1 = element("h1");
    			h1.innerHTML = `<span class="svelte-1vdy5np">Juan</span> Gnomo`;
    			t3 = space();
    			h2 = element("h2");
    			h2.textContent = "Servicios Mágicos";
    			t5 = space();
    			div1 = element("div");
    			div1.textContent = "Protección de Jardines";
    			t7 = space();
    			div2 = element("div");
    			div2.textContent = "Cuidado de Tesoros";
    			t9 = space();
    			div3 = element("div");
    			div3.textContent = "Travesuras en gral.";
    			t11 = space();
    			footer = element("footer");
    			div4 = element("div");
    			span1 = element("span");
    			span1.textContent = "Contacto";
    			t13 = space();
    			span2 = element("span");
    			span2.innerHTML = `<i class="fas fa-check"></i> Tips`;
    			t15 = space();
    			span3 = element("span");
    			span3.textContent = "Info";
    			attr(div0, "class", "containerImg");
    			attr(h1, "class", "svelte-1vdy5np");
    			attr(h2, "class", "svelte-1vdy5np");
    			attr(div1, "class", "btn svelte-1vdy5np");
    			attr(div2, "class", "btn svelte-1vdy5np");
    			attr(div3, "class", "btn svelte-1vdy5np");
    			attr(span1, "class", "svelte-1vdy5np");
    			attr(span2, "class", "svelte-1vdy5np");
    			attr(span3, "class", "svelte-1vdy5np");
    			attr(div4, "class", "footerCont svelte-1vdy5np");
    			attr(footer, "class", "svelte-1vdy5np");
    			attr(div5, "class", "container svelte-1vdy5np");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div0);
    			append(div5, t0);
    			append(div5, h1);
    			append(div5, t3);
    			append(div5, h2);
    			append(div5, t5);
    			append(div5, div1);
    			append(div5, t7);
    			append(div5, div2);
    			append(div5, t9);
    			append(div5, div3);
    			append(div5, t11);
    			append(div5, footer);
    			append(footer, div4);
    			append(div4, span1);
    			append(div4, t13);
    			append(div4, span2);
    			append(div4, t15);
    			append(div4, span3);

    			if (!mounted) {
    				dispose = [
    					listen(div1, "click", /*showProgramacion*/ ctx[6]),
    					listen(div2, "click", /*showCompania*/ ctx[7]),
    					listen(div3, "click", /*showContentManager*/ ctx[11]),
    					listen(span1, "click", /*showContacto*/ ctx[9]),
    					listen(span2, "click", /*showTips*/ ctx[8]),
    					listen(span3, "click", /*showInfo*/ ctx[10])
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i(local) {
    			if (!div5_intro) {
    				add_render_callback(() => {
    					div5_intro = create_in_transition(div5, fade, {});
    					div5_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div5);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (65:0) {#if programacion == true}
    function create_if_block_5(ctx) {
    	let t;
    	let current;
    	const programacion_1 = new Programacion({});
    	programacion_1.$on("click", /*showProgramacion*/ ctx[6]);
    	const back = new Back({});
    	back.$on("click", /*showProgramacion*/ ctx[6]);

    	return {
    		c() {
    			create_component(programacion_1.$$.fragment);
    			t = space();
    			create_component(back.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(programacion_1, target, anchor);
    			insert(target, t, anchor);
    			mount_component(back, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(programacion_1.$$.fragment, local);
    			transition_in(back.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(programacion_1.$$.fragment, local);
    			transition_out(back.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(programacion_1, detaching);
    			if (detaching) detach(t);
    			destroy_component(back, detaching);
    		}
    	};
    }

    // (71:0) {#if compania == true}
    function create_if_block_4(ctx) {
    	let current;
    	const compania_1 = new Compania({});
    	compania_1.$on("click", /*showCompania*/ ctx[7]);

    	return {
    		c() {
    			create_component(compania_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(compania_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(compania_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(compania_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(compania_1, detaching);
    		}
    	};
    }

    // (76:0) {#if  tips == true}
    function create_if_block_3(ctx) {
    	let t;
    	let current;
    	const tips_1 = new Tips({});
    	const back = new Back({});
    	back.$on("click", /*showTips*/ ctx[8]);

    	return {
    		c() {
    			create_component(tips_1.$$.fragment);
    			t = space();
    			create_component(back.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tips_1, target, anchor);
    			insert(target, t, anchor);
    			mount_component(back, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(tips_1.$$.fragment, local);
    			transition_in(back.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tips_1.$$.fragment, local);
    			transition_out(back.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tips_1, detaching);
    			if (detaching) detach(t);
    			destroy_component(back, detaching);
    		}
    	};
    }

    // (81:0) {#if contacto == true}
    function create_if_block_2(ctx) {
    	let t;
    	let current;
    	const contacto_1 = new Contacto({});
    	const back = new Back({});
    	back.$on("click", /*showContacto*/ ctx[9]);

    	return {
    		c() {
    			create_component(contacto_1.$$.fragment);
    			t = space();
    			create_component(back.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(contacto_1, target, anchor);
    			insert(target, t, anchor);
    			mount_component(back, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(contacto_1.$$.fragment, local);
    			transition_in(back.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(contacto_1.$$.fragment, local);
    			transition_out(back.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(contacto_1, detaching);
    			if (detaching) detach(t);
    			destroy_component(back, detaching);
    		}
    	};
    }

    // (86:0) {#if info == true}
    function create_if_block_1$2(ctx) {
    	let t;
    	let current;
    	const info_1 = new Info({});
    	const back = new Back({});
    	back.$on("click", /*showInfo*/ ctx[10]);

    	return {
    		c() {
    			create_component(info_1.$$.fragment);
    			t = space();
    			create_component(back.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(info_1, target, anchor);
    			insert(target, t, anchor);
    			mount_component(back, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(info_1.$$.fragment, local);
    			transition_in(back.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(info_1.$$.fragment, local);
    			transition_out(back.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(info_1, detaching);
    			if (detaching) detach(t);
    			destroy_component(back, detaching);
    		}
    	};
    }

    // (91:0) {#if contentManager == true}
    function create_if_block$2(ctx) {
    	let t;
    	let current;
    	const contentmanager = new ContentManager({});
    	const back = new Back({});
    	back.$on("click", /*showContentManager*/ ctx[11]);

    	return {
    		c() {
    			create_component(contentmanager.$$.fragment);
    			t = space();
    			create_component(back.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(contentmanager, target, anchor);
    			insert(target, t, anchor);
    			mount_component(back, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(contentmanager.$$.fragment, local);
    			transition_in(back.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(contentmanager.$$.fragment, local);
    			transition_out(back.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(contentmanager, detaching);
    			if (detaching) detach(t);
    			destroy_component(back, detaching);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let if_block6_anchor;
    	let current;
    	let if_block0 = /*programacion*/ ctx[0] == false && /*compania*/ ctx[1] == false && /*tips*/ ctx[2] == false && /*contacto*/ ctx[3] == false && /*info*/ ctx[4] == false && /*contentManager*/ ctx[5] == false && create_if_block_6(ctx);
    	let if_block1 = /*programacion*/ ctx[0] == true && create_if_block_5(ctx);
    	let if_block2 = /*compania*/ ctx[1] == true && create_if_block_4(ctx);
    	let if_block3 = /*tips*/ ctx[2] == true && create_if_block_3(ctx);
    	let if_block4 = /*contacto*/ ctx[3] == true && create_if_block_2(ctx);
    	let if_block5 = /*info*/ ctx[4] == true && create_if_block_1$2(ctx);
    	let if_block6 = /*contentManager*/ ctx[5] == true && create_if_block$2(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			t4 = space();
    			if (if_block5) if_block5.c();
    			t5 = space();
    			if (if_block6) if_block6.c();
    			if_block6_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, t2, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert(target, t3, anchor);
    			if (if_block4) if_block4.m(target, anchor);
    			insert(target, t4, anchor);
    			if (if_block5) if_block5.m(target, anchor);
    			insert(target, t5, anchor);
    			if (if_block6) if_block6.m(target, anchor);
    			insert(target, if_block6_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*programacion*/ ctx[0] == false && /*compania*/ ctx[1] == false && /*tips*/ ctx[2] == false && /*contacto*/ ctx[3] == false && /*info*/ ctx[4] == false && /*contentManager*/ ctx[5] == false) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*programacion, compania, tips, contacto, info, contentManager*/ 63) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*programacion*/ ctx[0] == true) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*programacion*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*compania*/ ctx[1] == true) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*compania*/ 2) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_4(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(t2.parentNode, t2);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*tips*/ ctx[2] == true) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*tips*/ 4) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block_3(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(t3.parentNode, t3);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (/*contacto*/ ctx[3] == true) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);

    					if (dirty & /*contacto*/ 8) {
    						transition_in(if_block4, 1);
    					}
    				} else {
    					if_block4 = create_if_block_2(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(t4.parentNode, t4);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}

    			if (/*info*/ ctx[4] == true) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);

    					if (dirty & /*info*/ 16) {
    						transition_in(if_block5, 1);
    					}
    				} else {
    					if_block5 = create_if_block_1$2(ctx);
    					if_block5.c();
    					transition_in(if_block5, 1);
    					if_block5.m(t5.parentNode, t5);
    				}
    			} else if (if_block5) {
    				group_outros();

    				transition_out(if_block5, 1, 1, () => {
    					if_block5 = null;
    				});

    				check_outros();
    			}

    			if (/*contentManager*/ ctx[5] == true) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);

    					if (dirty & /*contentManager*/ 32) {
    						transition_in(if_block6, 1);
    					}
    				} else {
    					if_block6 = create_if_block$2(ctx);
    					if_block6.c();
    					transition_in(if_block6, 1);
    					if_block6.m(if_block6_anchor.parentNode, if_block6_anchor);
    				}
    			} else if (if_block6) {
    				group_outros();

    				transition_out(if_block6, 1, 1, () => {
    					if_block6 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block4);
    			transition_in(if_block5);
    			transition_in(if_block6);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block4);
    			transition_out(if_block5);
    			transition_out(if_block6);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(t2);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach(t3);
    			if (if_block4) if_block4.d(detaching);
    			if (detaching) detach(t4);
    			if (if_block5) if_block5.d(detaching);
    			if (detaching) detach(t5);
    			if (if_block6) if_block6.d(detaching);
    			if (detaching) detach(if_block6_anchor);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let programacion = false;
    	let compania = false;
    	let tips = false;
    	let contacto = false;
    	let info = false;
    	let contentManager = false;

    	const showProgramacion = () => {
    		$$invalidate(0, programacion = !programacion);
    	};

    	const showCompania = () => {
    		$$invalidate(1, compania = !compania);
    	};

    	const showTips = () => {
    		$$invalidate(2, tips = !tips);
    	};

    	const showContacto = () => {
    		$$invalidate(3, contacto = !contacto);
    	};

    	const showInfo = () => {
    		$$invalidate(4, info = !info);
    	};

    	const showContentManager = () => {
    		$$invalidate(5, contentManager = !contentManager);
    	};

    	return [
    		programacion,
    		compania,
    		tips,
    		contacto,
    		info,
    		contentManager,
    		showProgramacion,
    		showCompania,
    		showTips,
    		showContacto,
    		showInfo,
    		showContentManager
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$8, safe_not_equal, {});
    	}
    }

    const app = new App({
    	target: document.body,

    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
