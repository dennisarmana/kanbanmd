/**
 * Markdown parser for Kanban.md Web Tool
 * Converts markdown text to a structured kanban board data format
 */

/**
 * Parse markdown content into kanban board structure
 * @param {string} markdown - Markdown content to parse
 * @returns {Array} Array of column objects with their cards
 */
function parseMarkdown(markdown) {
  // Split the markdown content by lines
  const lines = markdown.split('\n');
  const columns = [];
  let currentColumn = null;
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines or metadata lines
    if (!line || line.startsWith('---') || line.startsWith('%')) {
      continue;
    }
    
    // Check if line is a heading (column)
    if (line.startsWith('##')) {
      const columnTitle = line.replace(/^##\s+/, '').trim();
      currentColumn = {
        title: columnTitle,
        cards: []
      };
      columns.push(currentColumn);
    } 
    // Check if line is a list item (card)
    else if (line.startsWith('-') && currentColumn) {
      // Extract task content and check status
      let cardText = line.substring(1).trim();
      let isCompleted = false;
      
      // Check for checkbox syntax
      if (cardText.startsWith('[ ]')) {
        cardText = cardText.substring(3).trim();
        isCompleted = false;
      } else if (cardText.startsWith('[x]') || cardText.startsWith('[X]')) {
        cardText = cardText.substring(3).trim();
        isCompleted = true;
      }
      
      // Add card to current column
      currentColumn.cards.push({
        text: cardText,
        completed: isCompleted
      });
    }
  }
  
  // Validate we have at least one column
  if (columns.length === 0) {
    throw new Error('No valid kanban columns found in the markdown file');
  }
  
  return columns;
}

/**
 * Convert kanban board data back to markdown
 * @param {Array} columns - Array of column objects with their cards
 * @returns {string} Markdown representation of the kanban board
 */
function generateMarkdown(columns) {
  let markdown = '---\n\nkanban-plugin: board\n\n---\n\n';
  
  // Process each column
  columns.forEach(column => {
    markdown += `## ${column.title}\n\n`;
    
    // Process each card in the column
    column.cards.forEach(card => {
      const checkbox = card.completed ? '[x]' : '[ ]';
      markdown += `- ${checkbox} ${card.text}\n`;
    });
    
    markdown += '\n\n';
  });
  
  // Add settings section for compatibility
  markdown += '%% kanban:settings\n```\n{"kanban-plugin":"board"}\n```\n%%\n';
  
  return markdown;
}
