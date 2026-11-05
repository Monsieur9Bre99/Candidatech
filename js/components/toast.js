import { $ } from "../utils/dom.js";

export function createToast(selector = "#toast") {
    let timer;

    return function notify(message) {
        const toast = $(selector);
        toast.textContent = message;
        toast.classList.add("is-visible");
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
    };
}
