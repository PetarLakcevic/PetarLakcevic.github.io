var coll = document.getElementsByClassName("collapsible");
var i;

for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function () {
        this.classList.toggle("collapsible-active");
        var drawer = this.nextElementSibling;
        if (drawer.style.maxHeight) {
            drawer.style.maxHeight = null;
        } else {
            drawer.style.maxHeight = drawer.scrollHeight + "px";
        }
    });
}
