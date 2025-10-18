/*
  Prosta aplikacja To‑Do (vanilla JS)
  — funkcje: dodawanie, oznaczanie ukończenia, edycja w miejscu, usuwanie,
    filtrowanie (wszystkie/aktywne/ukończone) oraz trwałość w localStorage.

  Architektura i przepływ danych:
  - Stan aplikacji to tablica "todos" (obiekty: { id, title, completed, createdAt }).
  - Zmiany stanu trafiają do localStorage (persist) i odświeżają widok (render).
  - Widok (DOM) jest w całości budowany na podstawie stanu (funkcja render + renderItem).
  - Interakcje użytkownika (submit formularza, kliknięcia, edycja) modyfikują stan
    i wywołują "persist()" oraz "render()".

  Uwagi wdrożeniowe:
  - Brak zależności zewnętrznych — wystarczy otworzyć index.html w przeglądarce.
  - Drobne elementy dostępności (aria-*) i focus-visible poprawiają UX.
  - Filtry działają wyłącznie w pamięci (frontend), bez komunikacji z serwerem.
*/
(function () {
  // Klucz w localStorage do przechowywania listy zadań
  const STORAGE_KEY = 'ptaweb.todos.v1';

  /** @typedef {{id:string,title:string,completed:boolean,createdAt:number}} Todo */

  /**
   * Bieżący stan listy zadań.
   * Wczytywany z localStorage przy starcie, każda zmiana -> persist() i render().
   * @type {Todo[]}
   */
  let todos = load();
  // Aktualnie aktywny filtr widoku: 'all' | 'active' | 'completed'
  let filter = 'all';

  // Odwołania do elementów interfejsu (DOM)
  const form = document.getElementById('new-todo-form');
  const input = document.getElementById('new-todo-input');
  const list = document.getElementById('todo-list');
  const count = document.getElementById('todo-count');
  const clearBtn = document.getElementById('clear-completed');
  const filterBtns = Array.from(document.querySelectorAll('.filter'));

  // Inicjalizacja UI — ustaw aktywny filtr i zbuduj listę
  updateFiltersUI();
  render();

  // Zdarzenia aplikacji
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // 1) Odczytaj i przetnij białe znaki
    const title = (input.value || '').trim();
    // 2) Puste tytuły są ignorowane
    if (!title) return;
    // 3) Dodaj nowe zadanie na początek listy
    todos.unshift(createTodo(title));
    // 4) Wyczyść pole input
    input.value = '';
    // 5) Zapisz i odśwież widok
    persist();
    render();
  });

  clearBtn.addEventListener('click', () => {
    // Usuń wszystkie zadania oznaczone jako ukończone
    const hadCompleted = todos.some(t => t.completed);
    if (!hadCompleted) return;
    todos = todos.filter(t => !t.completed);
    persist();
    render();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Przełącz filtr zgodnie z data-filter
      filter = btn.dataset.filter || 'all';
      updateFiltersUI();
      render();
    });
  });

  list.addEventListener('click', (e) => {
    const target = e.target;
    /** @type {HTMLElement|null} */
    const item = target.closest('li[data-id]');
    if (!item) return;
    const id = item.dataset.id;

    // Obsługa kliknięć w obrębie wiersza zadania (checkbox/edytuj/usuń)
    if (target.matches('input[type="checkbox"]')) {
      toggle(id, target.checked);
      return;
    }
    if (target.matches('[data-action="delete"]')) {
      remove(id);
      return;
    }
    if (target.matches('[data-action="edit"]')) {
      startEdit(item, id);
      return;
    }
  });

  /**
   * Rozpocznij edycję tytułu zadania w miejscu (inline editing).
   * Zastępuje <p> polem <input>, pozwalając na Enter/Escape/blur do zakończenia.
   * @param {HTMLElement} item Element li reprezentujący zadanie
   * @param {string} id Id edytowanego zadania
   */
  function startEdit(item, id) {
    const t = todos.find(x => x.id === id);
    if (!t) return;
    const titleEl = item.querySelector('.todo__title');
    const actions = item.querySelector('.todo__actions');
    if (!titleEl || !actions) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = t.title;
    input.className = 'edit-input';
    input.setAttribute('aria-label', 'Edytuj zadanie');
    titleEl.replaceWith(input);
    input.focus();
    input.selectionStart = input.value.length;

    // Zakończ edycję: commit=true zapisuje, commit=false przywraca poprzednią wartość
    const finish = (commit) => {
      const newTitle = (input.value || '').trim();
      if (commit) {
        if (newTitle) {
          t.title = newTitle;
          persist();
        } else {
          // empty -> delete
          remove(id);
          return;
        }
      }
      render();
    };

    // Enter — zaakceptuj, Esc — anuluj, blur — zaakceptuj
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  }

  /**
   * Zbuduj widok na podstawie stanu i aktywnego filtra.
   * Czyści listę i dodaje elementy li utworzone przez renderItem.
   */
  function render() {
    const filtered = todos.filter(t =>
      filter === 'active' ? !t.completed : filter === 'completed' ? t.completed : true
    );

    list.innerHTML = '';
    for (const t of filtered) {
      list.appendChild(renderItem(t));
    }
    const remaining = todos.filter(t => !t.completed).length;
    count.textContent = `${remaining} zadań`;
  }

  /**
   * Utwórz element DOM reprezentujący jedno zadanie (li + zawartość).
   * @param {Todo} t Zadanie do wyrenderowania
   * @returns {HTMLLIElement}
   */
  function renderItem(t) {
    const li = document.createElement('li');
    li.className = 'todo';
    li.dataset.id = t.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.checked = t.completed;
    checkbox.setAttribute('aria-label', 'Oznacz jako ukończone');

    const title = document.createElement('p');
    title.className = 'todo__title' + (t.completed ? ' is-completed' : '');
    title.textContent = t.title;

    const actions = document.createElement('div');
    actions.className = 'todo__actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'todo__btn';
    editBtn.textContent = 'Edytuj';
    editBtn.setAttribute('data-action', 'edit');

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'todo__btn todo__btn--danger';
    delBtn.textContent = 'Usuń';
    delBtn.setAttribute('data-action', 'delete');

    actions.append(editBtn, delBtn);
    li.append(checkbox, title, actions);
    return li;
  }

  /**
   * Przełącz ukończenie zadania i odśwież widok.
   * @param {string} id
   * @param {boolean} value
   */
  function toggle(id, value) {
    const t = todos.find(x => x.id === id);
    if (!t) return;
    t.completed = Boolean(value);
    persist();
    render();
  }

  /**
   * Usuń zadanie po id i odśwież widok.
   * @param {string} id
   */
  function remove(id) {
    todos = todos.filter(t => t.id !== id);
    persist();
    render();
  }

  /**
   * Fabryka nowego zadania — minimalny kształt obiektu stanu.
   * @param {string} title
   * @returns {Todo}
   */
  function createTodo(title) {
    return { id: cryptoRandom(), title, completed: false, createdAt: Date.now() };
  }

  // Zapisz aktualny stan do localStorage (trwałość między sesjami)
  function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)); }

  // Wczytaj stan z localStorage, z prostą walidacją struktury
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(x => x && typeof x.title === 'string' && typeof x.completed === 'boolean' && typeof x.id === 'string');
    } catch { return []; }
  }

  /**
   * Zaktualizuj wygląd przycisków filtrów (klasa .is-active + aria-selected).
   */
  function updateFiltersUI() {
    document.querySelectorAll('.filter').forEach(b => {
      const active = (b.dataset.filter || 'all') === filter;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    });
  }

  /**
   * Generator losowego identyfikatora (preferuje Web Crypto dla entropii).
   * @returns {string}
   */
  function cryptoRandom() {
    // Prefer crypto if available
    if (window.crypto && crypto.getRandomValues) {
      const a = new Uint32Array(4);
      crypto.getRandomValues(a);
      return Array.from(a, x => x.toString(16).padStart(8, '0')).join('');
    }
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
})();
