const React = require('react');
const ReactDOM = require('react-dom');
const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;

let selectedFilenames = [];

const selectFilesButton = document.getElementById('select_files');
selectFilesButton.addEventListener('click', () => {
  dialog.showOpenDialog(
    {
      filters: [
        { name: 'CR2 Raw Images', extensions: ['cr2'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    },
    filePaths => {
      if (filePaths) {
        updateFilenames(filePaths);
      }
    }
  );
});

function updateFilenames(filenames) {
  selectedFilenames = selectedFilenames.concat(
    filenames.filter(name => selectedFilenames.indexOf(name) === -1)
  );
  renderFilelist();
}

function removeFilename(filename) {
  selectedFilenames = selectedFilenames.filter(name => name !== filename);
  renderFilelist();
}

function renderFilelist(removeDisabled = false) {
  ReactDOM.render(
    React.createElement(
      'ul',
      { className: 'list-group' },
      selectedFilenames.map(filename => {
        return React.createElement(SelectedFile, {
          key: filename,
          filename,
          onRemove: () => removeFilename(filename),
          removeDisabled
        });
      })
    ),
    document.getElementById('files_selected')
  );
}

const filenameContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  width: 'calc(100vw - 2rem)',
};

const filenameStyle = {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    direction: 'rtl',
};

function SelectedFile({ filename, onRemove, removeDisabled }) {
  return React.createElement(
    'li',
    { className: 'list-group-item', style: filenameContainerStyle },
    React.createElement('span', { style: filenameStyle }, filename),
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'btn btn-danger',
        onClick: onRemove,
        disabled: removeDisabled
      },
      '✖'
    )
  );
}

let filesRead = 0;
let filesDecoded = 0;
let filesConverted = 0;
let filesWritten = 0;

const convertFilesButton = document.getElementById('convert_files');
convertFilesButton.addEventListener('click', () => {
  renderFilelist(true);
  setTimeout(() => convertFilesButton.style.display = 'none');
  document.getElementById('progress').style.display = 'block';
  ReactDOM.render(
    React.createElement(
      ProgressBar,
      { progress: 1, total: 1, successColor: false }
    ),
    document.getElementById('progress-indefinite')
  );
  renderConvertProgress();
  for (const filename of selectedFilenames) {
    ipcRenderer.send('convert-from-raw', filename);
  }
});

ipcRenderer.on('read-error', name => alert(`File ${name} could not be read`));
ipcRenderer.on('decode-error', name => alert(`File ${name} could not be decoded`));
ipcRenderer.on('convert-error', name => alert(`File ${name} could not be converted`));
ipcRenderer.on('write-error', name => alert(`File ${name} could not be written`));
ipcRenderer.on('read-success', () => {
  filesRead++;
  renderConvertProgress();
});
ipcRenderer.on('decode-success', () => {
  filesDecoded++;
  renderConvertProgress();
});
ipcRenderer.on('convert-success', () => {
  filesConverted++;
  renderConvertProgress();
});
ipcRenderer.on('write-success', () => {
  filesWritten++;
  renderConvertProgress();
});

function renderConvertProgress() {
  ReactDOM.render(
    React.createElement(
      ProgressBar,
      {
        progress: filesRead + filesDecoded + filesConverted + filesWritten,
        total: selectedFilenames.length * 4,
        successColor: true
      }
    ),
    document.getElementById('progress-moving')
  );
}

function ProgressBar({ progress, total, successColor = false }) {
  const p = (progress / total) * 100;
  const done = progress === total;
  return React.createElement(
    'div',
    {
      className:
        'progress-bar progress-bar-striped'
          + (successColor ? 'bg-success' : '')
          + (done ? 'progress-bar-animated' : ''),
      role: 'progressbar',
      'aria-valuenow': p,
      'aria-valuemin': 0,
      'area-valuemax': 100,
      style: { width: p + '%', marginBottom: '1rem' }
    },
    done && !successColor && 'Done!'
  );
}
