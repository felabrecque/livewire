import { trigger } from "@/hooks"
import { closestComponent } from "@/store"
import Alpine from 'alpinejs'

export function morph(component, el, html) {
    let wrapperTag = el.parentElement
        // If the root element is a "tr", we need the wrapper to be a "table"...
        ? el.parentElement.tagName.toLowerCase()
        : 'div'

    let wrapper = document.createElement(wrapperTag)

    wrapper.innerHTML = html
    let parentComponent

    try {
        parentComponent = closestComponent(el.parentElement)
    } catch (e) {}

    parentComponent && (wrapper.__livewire = parentComponent)

    let to = wrapper.firstElementChild

    to.__livewire = component

    trigger('morph', { el, toEl: to, component })

    Alpine.morph(el, to, getMorphConfig(component))

    trigger('morphed', { el, component })
}

export function morphPartial(component, startNode, endNode, toHTML) {
    let fromContainer = startNode.parentElement
    let fromContainerTag = fromContainer ? fromContainer.tagName.toLowerCase() : 'div'

    let toContainer = document.createElement(fromContainerTag)
    toContainer.innerHTML = toHTML
    toContainer.__livewire = component

    // Add the parent component reference to an outer wrapper if it exists...
    let parentElement = component.el.parentElement
    let parentElementTag = parentElement ? parentElement.tagName.toLowerCase() : 'div'

    let parentComponent

    try {
        parentComponent = parentElement ? closestComponent(parentElement) : null
    } catch (e) {}

    if (parentComponent) {
        let parentProviderWrapper = document.createElement(parentElementTag)
        parentProviderWrapper.appendChild(toContainer)
        parentProviderWrapper.__livewire = parentComponent
    }

    trigger('partial.morph', { startNode, endNode, component })

    Alpine.morphBetween(startNode, endNode, toContainer, getMorphConfig(component))

    trigger('partial.morphed', { startNode, endNode, component })
}

function getMorphConfig(component) {
    return {
        updating: (el, toEl, childrenOnly, skip, skipChildren, skipUntil) => {
            skipSlotContents(el, toEl, skipUntil)

            if (isntElement(el)) return

            trigger('morph.updating', { el, toEl, component, skip, childrenOnly, skipChildren })

            // bypass DOM diffing for children by overwriting the content
            if (el.__livewire_replace === true) el.innerHTML = toEl.innerHTML;
            // completely bypass DOM diffing for this element and all children
            if (el.__livewire_replace_self === true) { el.outerHTML = toEl.outerHTML; return skip(); }

            if (el.__livewire_ignore === true) return skip()
            if (el.__livewire_ignore_self === true) childrenOnly()
            if (el.__livewire_ignore_children === true) return skipChildren()

            // Children will update themselves.
            if (isComponentRootEl(el) && el.getAttribute('wire:id') !== component.id) return skip()

            // Give the root Livewire "to" element, the same object reference as the "from"
            // element. This ensures new Alpine magics like $wire and @entangle can
            // initialize in the context of a real Livewire component object.
            if (isComponentRootEl(el)) toEl.__livewire = component
        },

        updated: (el) => {
            if (isntElement(el)) return

            trigger('morph.updated', { el, component })
        },

        removing: (el, skip) => {
            if (isntElement(el)) return

            trigger('morph.removing', { el, component, skip })
        },

        removed: (el) => {
            if (isntElement(el)) return

            trigger('morph.removed', { el, component })
        },

        adding: (el) => {
            trigger('morph.adding', { el, component })
        },

        added: (el) => {
            if (isntElement(el)) return

            const closestComponentId = closestComponent(el).id

            trigger('morph.added', { el })
        },

        key: (el) => {
            if (isntElement(el)) return

            return el.hasAttribute(`wire:key`)
                ? el.getAttribute(`wire:key`)
                : // If no "key", then first check for "wire:id", then "id"
                el.hasAttribute(`wire:id`)
                    ? el.getAttribute(`wire:id`)
                    : el.id
        },

        lookahead: false,
    }
}

function isntElement(el) {
    return typeof el.hasAttribute !== 'function'
}

function isComponentRootEl(el) {
    return el.hasAttribute('wire:id')
}
