/**
 * Kanban board rendering and interaction functionality
 */

/**
 * Render the kanban board with columns and cards
 * @param {HTMLElement} container - Container element to render the board in
 * @param {Array} columns - Array of column objects with their cards
 */
function renderKanbanBoard(container, columns) {
  // Clear the container
  container.innerHTML = '';
  
  // Create and append each column
  columns.forEach((column, columnIndex) => {
    const columnElement = createColumnElement(column, columnIndex);
    container.appendChild(columnElement);
  });
  
  // Initialize drag and drop functionality
  initDragAndDrop();
  
  // Add button to go back to file selection
  addControlButtons(container);
}

/**
 * Create a column element with header and cards
 * @param {Object} column - Column data object
 * @param {number} columnIndex - Index of the column
 * @returns {HTMLElement} The created column element
 */
function createColumnElement(column, columnIndex) {
  const columnElement = document.createElement('div');
  columnElement.className = 'kanban-column';
  columnElement.dataset.columnIndex = columnIndex;
  
  // Create column header
  const headerElement = document.createElement('div');
  headerElement.className = 'column-header';
  headerElement.textContent = column.title;
  columnElement.appendChild(headerElement);
  
  // Create cards container
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'cards-container';
  columnElement.appendChild(cardsContainer);
  
  // Add cards to the column
  column.cards.forEach((card, cardIndex) => {
    const cardElement = createCardElement(card, cardIndex, columnIndex);
    cardsContainer.appendChild(cardElement);
  });
  
  // Add "Add Card" button
  const addButton = document.createElement('button');
  addButton.className = 'add-card-btn';
  addButton.textContent = '+ Add Card';
  addButton.addEventListener('click', () => handleAddCard(columnIndex));
  columnElement.appendChild(addButton);
  
  return columnElement;
}

/**
 * Create a card element
 * @param {Object} card - Card data object
 * @param {number} cardIndex - Index of the card in its column
 * @param {number} columnIndex - Index of the column containing the card
 * @returns {HTMLElement} The created card element
 */
function createCardElement(card, cardIndex, columnIndex) {
  const cardElement = document.createElement('div');
  cardElement.className = 'kanban-card';
  cardElement.dataset.cardIndex = cardIndex;
  cardElement.dataset.columnIndex = columnIndex;
  cardElement.draggable = true;
  
  // Create checkbox for completion status
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = card.completed;
  checkbox.addEventListener('change', () => {
    // Update the data model when checkbox is toggled
    const boardData = getBoardDataFromDOM();
    boardData[columnIndex].cards[cardIndex].completed = checkbox.checked;
    saveBoard(boardData);
  });
  
  // Create text content
  const textSpan = document.createElement('span');
  textSpan.className = 'card-text';
  textSpan.textContent = card.text;
  
  // Add double-click to edit
  textSpan.addEventListener('dblclick', () => {
    handleEditCard(textSpan, columnIndex, cardIndex);
  });
  
  // Create delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-card-btn';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.addEventListener('click', () => {
    handleDeleteCard(columnIndex, cardIndex);
  });
  
  // Append elements to card
  cardElement.appendChild(checkbox);
  cardElement.appendChild(textSpan);
  cardElement.appendChild(deleteBtn);
  
  return cardElement;
}

/**
 * Initialize drag and drop functionality for cards
 */
function initDragAndDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const columns = document.querySelectorAll('.cards-container');
  
  // Add drag events to cards
  cards.forEach(card => {
    card.addEventListener('dragstart', dragStart);
    card.addEventListener('dragend', dragEnd);
  });
  
  // Add drop events to columns
  columns.forEach(column => {
    column.addEventListener('dragover', dragOver);
    column.addEventListener('dragenter', dragEnter);
    column.addEventListener('dragleave', dragLeave);
    column.addEventListener('drop', drop);
  });
  
  // Drag functions
  function dragStart() {
    this.classList.add('dragging');
  }
  
  function dragEnd() {
    this.classList.remove('dragging');
  }
  
  function dragOver(e) {
    e.preventDefault();
  }
  
  function dragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
  }
  
  function dragLeave() {
    this.classList.remove('drag-over');
  }
  
  function drop() {
    this.classList.remove('drag-over');
    
    // Get the dragged card
    const draggedCard = document.querySelector('.dragging');
    if (!draggedCard) return;
    
    // Source column and card indices
    const sourceColumnIndex = parseInt(draggedCard.dataset.columnIndex);
    const sourceCardIndex = parseInt(draggedCard.dataset.cardIndex);
    
    // Target column index
    const targetColumnIndex = parseInt(this.parentNode.dataset.columnIndex);
    
    // Get current board data
    const boardData = getBoardDataFromDOM();
    
    // Get the card data
    const cardData = boardData[sourceColumnIndex].cards[sourceCardIndex];
    
    // Remove card from source column
    boardData[sourceColumnIndex].cards.splice(sourceCardIndex, 1);
    
    // Add card to target column
    boardData[targetColumnIndex].cards.push(cardData);
    
    // Re-render board with updated data
    renderKanbanBoard(document.getElementById('board-container'), boardData);
    
    // Save the updated board
    saveBoard(boardData);
  }
}

/**
 * Handle adding a new card to a column
 * @param {number} columnIndex - Index of the column to add card to
 */
function handleAddCard(columnIndex) {
  const boardData = getBoardDataFromDOM();
  
  // Create new card with default text
  boardData[columnIndex].cards.push({
    text: 'New Card',
    completed: false
  });
  
  // Re-render the board
  renderKanbanBoard(document.getElementById('board-container'), boardData);
  
  // Save the updated board
  saveBoard(boardData);
}

/**
 * Handle editing a card's text
 * @param {HTMLElement} textElement - The text element to edit
 * @param {number} columnIndex - Index of the column containing the card
 * @param {number} cardIndex - Index of the card to edit
 */
function handleEditCard(textElement, columnIndex, cardIndex) {
  const currentText = textElement.textContent;
  
  // Replace text with input field
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.className = 'edit-card-input';
  
  textElement.parentNode.replaceChild(input, textElement);
  input.focus();
  
  // Handle saving changes when done editing
  function saveEdit() {
    const newText = input.value.trim();
    
    // Update text element
    textElement.textContent = newText;
    input.parentNode.replaceChild(textElement, input);
    
    // Update data model
    const boardData = getBoardDataFromDOM();
    boardData[columnIndex].cards[cardIndex].text = newText;
    
    // Save changes
    saveBoard(boardData);
  }
  
  input.addEventListener('blur', saveEdit);
  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      saveEdit();
    }
  });
}

/**
 * Handle deleting a card
 * @param {number} columnIndex - Index of the column containing the card
 * @param {number} cardIndex - Index of the card to delete
 */
function handleDeleteCard(columnIndex, cardIndex) {
  if (confirm('Are you sure you want to delete this card?')) {
    // Get current board data
    const boardData = getBoardDataFromDOM();
    
    // Remove the card
    boardData[columnIndex].cards.splice(cardIndex, 1);
    
    // Re-render the board
    renderKanbanBoard(document.getElementById('board-container'), boardData);
    
    // Save the updated board
    saveBoard(boardData);
  }
}

/**
 * Extract board data from the current DOM structure
 * @returns {Array} Array of column objects with their cards
 */
function getBoardDataFromDOM() {
  const columns = document.querySelectorAll('.kanban-column');
  const boardData = [];
  
  columns.forEach(column => {
    const columnIndex = parseInt(column.dataset.columnIndex);
    const headerElement = column.querySelector('.column-header');
    const cardElements = column.querySelectorAll('.kanban-card');
    
    const columnData = {
      title: headerElement.textContent,
      cards: []
    };
    
    cardElements.forEach(card => {
      const checkbox = card.querySelector('input[type="checkbox"]');
      const textSpan = card.querySelector('.card-text');
      
      columnData.cards.push({
        text: textSpan.textContent,
        completed: checkbox.checked
      });
    });
    
    boardData[columnIndex] = columnData;
  });
  
  return boardData;
}

/**
 * Add control buttons to the board
 * @param {HTMLElement} container - The board container element
 */
function addControlButtons(container) {
  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'board-controls';
  
  // Back button
  const backButton = document.createElement('button');
  backButton.textContent = 'Back to File Selection';
  backButton.addEventListener('click', () => {
    document.getElementById('file-section').style.display = 'block';
    container.classList.add('hidden');
  });
  
  // Save button
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Download Kanban.md';
  saveButton.addEventListener('click', () => {
    downloadKanbanFile();
  });
  
  // Append buttons
  controlsDiv.appendChild(backButton);
  controlsDiv.appendChild(saveButton);
  
  // Add controls div before the board
  container.parentNode.insertBefore(controlsDiv, container);
}

/**
 * Save the current board state
 * @param {Array} boardData - Array of column objects with their cards
 */
function saveBoard(boardData) {
  // For now, we're just updating the UI
  // In a real implementation, this would sync with the file
  console.log('Board saved:', boardData);
  
  // TODO: Implement actual file synchronization
}

/**
 * Download the current kanban board as a markdown file
 */
function downloadKanbanFile() {
  const boardData = getBoardDataFromDOM();
  const markdown = generateMarkdown(boardData);
  
  // Create download link
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kanban.md';
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}
