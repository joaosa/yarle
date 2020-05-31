import { cloneDeep } from 'lodash';
import * as fs from 'fs';
import * as moment from 'moment';

import * as utils from './utils';
import { yarleOptions } from './yarle';

export const processResources = (note: any, content: string): string => {
    let resourceHashes: any = {};
    let updatedContent = cloneDeep(content);
    const relativeResourceWorkDir = `${utils.getResourceDir(utils.paths.complexMdPath, note)}.resources`;
    const absoluteResourceWorkDir = `${utils.paths.resourcePath}/${relativeResourceWorkDir}`;

    utils.clearResourceDir(note);
    if (Array.isArray(note['resource'])) {
      for (const resource of note['resource']) {
        resourceHashes = {
          ...resourceHashes,
          ...processResource(absoluteResourceWorkDir, resource)};
      }
    } else {
      utils.clearResourceDir(note);
      resourceHashes = {
        ...resourceHashes,
        ...processResource(absoluteResourceWorkDir, note['resource'])};
    }

    for (const hash of Object.keys(resourceHashes)) {
      updatedContent = addMediaReference(updatedContent, resourceHashes, hash, relativeResourceWorkDir);
    }

    return updatedContent;
  };

const addMediaReference = (content: string, resourceHashes: any, hash: any, relativeResourceWorkDir: string): string => {

  const src = `./_resources/${relativeResourceWorkDir}/${resourceHashes[hash].replace(/ /g, '\ ')}`;
  let updatedContent = cloneDeep(content);
  const replace = (hash === 'any') ?
      '<en-media ([^>]*)hash=".([^>]*)>' :
      `<en-media ([^>]*)hash="${hash}".([^>]*)>`;

  const re = new RegExp(replace, 'g');

  const matchedElements = content.match(re);

  updatedContent = (matchedElements && matchedElements.length > 0 &&
    matchedElements[0].split('type=').length > 1 &&
    matchedElements[0].split('type=')[1].startsWith('"image')) ?
    content.replace(re, `<img alt="${resourceHashes[hash]}" src="${src}">`) :
    content.replace(re, `<a href="${src}">${resourceHashes[hash]}</a>`);

  return updatedContent;

};

const processResource = (workDir: string, resource: any): any => {
    const resourceHash: any = {};
    const data = resource['data'];

    if (resource['resource-attributes'] && resource['resource-attributes']['file-name']) {
      const timeStamp = resource['resource-attributes']['timestamp'];
      const fileName = resource['resource-attributes']['file-name'].substr(0, 50);
      const absFilePath = `${workDir}/${fileName}`;
      // tslint:disable-next-line: curly
      if (resource['recognition'] && resource['recognition']['__cdata'] && fileName) {
        const hashIndex = resource['recognition']['__cdata'].match(/[a-f0-9]{32}/);
        resourceHash[hashIndex as any] = fileName;
      } else {
        resourceHash['any'] = fileName;
      }

      const accessTime = timeStamp ? moment(timeStamp) : moment();
      fs.writeFileSync(absFilePath, data, 'base64');
      const atime = accessTime.valueOf() / 1000;
      fs.utimesSync(absFilePath, atime, atime);

    }

    return resourceHash;
};
