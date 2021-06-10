import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {getFileAndDirNameFromUrl} from './redact_utils.js'
import {
  buildAttributesAddRow, buildLabelAndTextInput, buildLabelAndDropdown,
  buildMatchIdField,
  buildInlinePrimaryButton, 
  buildTier1LoadButton, 
  buildTier1DeleteButton,
  makeHeaderRow,
  buildAttributesAsRows,
  buildIdString,
  clearTier1Matches,
  buildClearMatchesButton,
  buildRunButton,
  setLocalT1ScannerStateVar,
  doTier1Save,
} from './SharedControls'


class DataSifterControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      edit_ocr_data: false,
      show_app_boxes: false,
      show_app_rowcols: false,
      debug: false,
      rows: [],
      left_cols: [],
      right_cols: [],
      movie_url: '',
      image_url: '',
      source_image_base64: '',
      items: {},
      scale: '1:1',
      show_type: 'all',
      highlighted_item_id: '',
      ocr_job_id: '',
      attributes: {},
      scan_level: 'tier_1',
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
      delete_column_id: '',
      show_rowcol_id: '',
    }
    this.getDataSifterFromState=this.getDataSifterFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getShowType=this.getShowType.bind(this)
    this.getAppZones=this.getAppZones.bind(this)
    this.getAppRowCols=this.getAppRowCols.bind(this)
    this.deleteOcrAreaCallback=this.deleteOcrAreaCallback.bind(this)
    this.loadCurrentDataSifter=this.loadCurrentDataSifter.bind(this)
    this.getDataSifterHighlightedItemId=this.getDataSifterHighlightedItemId.bind(this)
    this.addItemCallback1=this.addItemCallback1.bind(this)
    this.addItemCallback2=this.addItemCallback2.bind(this)
    this.afterAddItem=this.afterAddItem.bind(this)
    this.deleteOcrCallback1=this.deleteOcrCallback1.bind(this)
    this.setHighlightedItem=this.setHighlightedItem.bind(this)
    this.afterMovieCreated=this.afterMovieCreated.bind(this)
    this.enableMovie=this.enableMovie.bind(this)
    this.doSave=this.doSave.bind(this)
    this.setState=this.setState.bind(this)
  }

  getRowNumberForItemId(item_id) {
    for (let i=0; i < this.state.rows.length; i++) {
      const row = this.state.rows[i]
      if (row.includes(item_id)) {
        return i
      }
    }
  }

  addItemToRow(new_item_id, new_item, row_num) {
    const build_rows = []
    for (let i=0; i < this.state.rows.length; i++) {
      const row = this.state.rows[i]
      if (i === row_num) {
        let build_row = []
        let item_was_added = false
        for (let j=0; j < row.length; j++) {
          const jth_item = this.state.items[row[j]]
          if (jth_item['location'][0] < new_item['location'][0]) {
            build_row.push(row[j])
          } else {
            build_row.push(new_item_id)
            build_row.push(row[j])
            item_was_added = true
          }
        }
        if (!item_was_added) {
          build_row.push(new_item_id)
        }
        build_rows.push(build_row)
      } else {
        build_rows.push(row)
      }
    }
    return build_rows
  }

  addLeftOfCurrentItem() {
    const cur_item = this.state.items[this.state.highlighted_item_id]
    const cur_row_num = this.getRowNumberForItemId(this.state.highlighted_item_id)
    const cur_end = [
      cur_item['location'][0] + cur_item['size'][0],
      cur_item['location'][1] + cur_item['size'][1]
    ]
    const new_start = [
      cur_item['location'][0] - 50,
      cur_item['location'][1]
    ]
    const new_end = [
      cur_item['location'][0] - 20,
      cur_end[1]
    ]
    const the_id = this.getNewItemId()
    if (!the_id) {
      return
    }
    const build_item = this.buildBasicLabelItemFromCoords(new_start, new_end)
    const new_rows = this.addItemToRow(the_id, build_item, cur_row_num)
    let deepCopyItems= JSON.parse(JSON.stringify(this.state.items))
    deepCopyItems[the_id] = build_item
    const set_var = {
      items: deepCopyItems,
      rows: new_rows,
      highlighted_item_id: the_id,
    }
    this.setLocalStateVar(set_var)
  }

  addRightOfCurrentItem() {
    const cur_item = this.state.items[this.state.highlighted_item_id]
    const cur_row_num = this.getRowNumberForItemId(this.state.highlighted_item_id)
    const cur_end = [
      cur_item['location'][0] + cur_item['size'][0],
      cur_item['location'][1] + cur_item['size'][1]
    ]
    const new_start = [
      cur_end[0] + 20,
      cur_item['location'][1]
    ]
    const new_end = [
      new_start[0] + 20,
      cur_end[1]
    ]
    const the_id = this.getNewItemId()
    if (!the_id) {
      return
    }
    const build_item = this.buildBasicLabelItemFromCoords(new_start, new_end)
    const new_rows = this.addItemToRow(the_id, build_item, cur_row_num)
    let deepCopyItems= JSON.parse(JSON.stringify(this.state.items))
    deepCopyItems[the_id] = build_item
    const set_var = {
      items: deepCopyItems,
      rows: new_rows,
      highlighted_item_id: the_id,
    }
    this.setLocalStateVar(set_var)
  }

  deleteOcrCallback1() {
    this.props.handleSetMode('ds_delete_ocr_area_2')
  }

  getNewItemId() {
    let the_id = 'm' + Math.floor(Math.random(10000, 99999)*10000).toString()
    let tries = 0
    while (Object.keys(this.state.items).includes(the_id) && tries < 100) {
      the_id = 'm' + Math.floor(Math.random(10000, 99999)*10000).toString()
      tries++ 
    }
    return the_id
  }

  buildBasicLabelItemFromCoords(start_coords, end_coords) {
    const size = [
      end_coords[0] - start_coords[0],
      end_coords[1] - start_coords[1]
    ]
    const build_item = {
      type: 'label',
      text: 'monkeys are funny',
      location: start_coords,
      size: size,
    }
    return build_item
  }

  addItemCallback2(end_coords) {
    const the_id = this.getNewItemId()
    if (!the_id) {
      return
    }
    const build_item = this.buildBasicLabelItemFromCoords(this.props.clicked_coords, end_coords)
    ////////////////////////////////////////////////
    // TODO try to quantize this item to a row, or create new row
    // 
    // HEY THIS IS A TODO
    //
    ////////////////////////////////////////////
    let deepCopyItems= JSON.parse(JSON.stringify(this.state.items))
    deepCopyItems[the_id] = build_item
    const set_var = {
      items: deepCopyItems,
      highlighted_item_id: the_id,
    }
    this.setLocalStateVar(
      set_var, 
      this.afterAddItem
    )
  }

  afterAddItem() {
    this.props.handleSetMode('ds_inspect_item')
  }

  addItemCallback1() {
    this.props.handleSetMode('ds_add_item_2')
  }

  buildBuildItemButtonsRow() {
    return (
      <div className='row mt-2'>
        <div className='ml-2'>
          <button
              className='btn btn-primary'
              onClick={() => this.props.handleSetMode('ds_add_item_1')}
          >
            Add Item
          </button>
        </div>
        <div className='ml-2'>
          <button
              className='btn btn-primary'
              onClick={() => this.props.handleSetMode('ds_inspect_item')}
          >
            Inspect Item
          </button>
        </div>
      </div>
    )
  }

  weAreOnTheSourceFrame() {
    if (
      (this.state.movie_url === this.props.movie_url) &&
      (this.state.image_url === this.props.insights_image)
    ) {
      return true
    }
  }

  buildShowColumnRow() {
    if (!this.state.left_cols && !this.state.right_cols) {
      return ''
    }
    if (!this.state.show_app_rowcols) {
      return ''
    }
    let values = [
      {'': 'all rows and columns'}
    ]
    for (let i=0; i < this.state.rows.length; i++) {
      values.push({
        ['row_' + i.toString()]:' row '+i.toString(),
      })
    }
    for (let i=0; i < this.state.left_cols.length; i++) {
      values.push({
        ['left_col_' + i.toString()]:'left column '+i.toString(),
      })
    }
    for (let i=0; i < this.state.right_cols.length; i++) {
      values.push({
        ['right_col_' + i.toString()]:'right column '+i.toString(),
      })
    }
    const the_dropdown = buildLabelAndDropdown(
      values,
      'Show only this row or column:',
      this.state.show_rowcol_id,
      'data_sifter_show_rowcol_id',
      ((value)=>{this.setState({'show_rowcol_id': value})})
    )
    return (
      <div className='row'>
        {the_dropdown}
      </div>
    )
  }

  deleteSelectedColumn() {
    if (this.state.delete_column_id.startsWith('left_col_')) {
      let offset_to_delete = parseInt(this.state.delete_column_id.substring(9))
      let deepCopyCols = JSON.parse(JSON.stringify(this.state.left_cols))
      deepCopyCols.splice(offset_to_delete, 1)
      const set_var = {
        left_cols: deepCopyCols,
        delete_column_id: '',
      }
      this.setLocalStateVar(set_var)
    } else if (this.state.delete_column_id.startsWith('right_col_')) {
      let offset_to_delete = parseInt(this.state.delete_column_id.substring(10))
      let deepCopyCols = JSON.parse(JSON.stringify(this.state.right_cols))
      deepCopyCols.splice(offset_to_delete, 1)
      const set_var = {
        right_cols: deepCopyCols,
        delete_column_id: '',
      }
      this.setLocalStateVar(set_var)
    } else if (this.state.delete_column_id === 'all') {
      const set_var = {
        left_cols: [],
        right_cols: [],
        delete_column_id: '',
      }
      this.setLocalStateVar(set_var)
    }
  }

  setCurrentItemRowAlignment(var_value) {
    const row_number = parseInt(var_value.substring(4))
    this.alignCurrentItemToRow(row_number)
  }

  setCurrentItemAlignment(var_value) {
    if (var_value === 'none') {
      this.unalignCurrentItemColumn()
    } else if (var_value.startsWith('left_col_')) {
      this.alignCurrentItemToColumns('left', parseInt(var_value.substring(9)))
    } else if (var_value === 'new_left_col') {
      this.insertCurrentItemInNewCol('left')
    } else if (var_value === 'new_right_col') {
      this.insertCurrentItemInNewCol('right')
    } else {
      this.alignCurrentItemToColumns('right', parseInt(var_value.substring(10)))
    }
  }

  afterMovieCreated(new_movie) {
    const img_url = this.state.image_url
    this.props.addImageToMovie({
      url: img_url,
      movie_url: this.state.movie_url,
      update_frameset_hash: false,
      movie: new_movie,
    })
  }

  enableMovie(image_url_returns_ok) {
    let image_frameset_index = 0
    if (image_url_returns_ok) {
      if (this.state.movie_url !== this.props.movie_url) {
        this.props.setGlobalStateVar('movie_url', this.state.movie_url)
      }
      const the_movie = this.props.movies[this.state.movie_url]
      const frameset_hash = this.props.getFramesetHashForImageUrl(this.state.image_url, the_movie['framesets'])
      const movie_framesets = this.props.getFramesetHashesInOrder(the_movie)
      image_frameset_index = movie_framesets.indexOf(frameset_hash)
    } else {
      this.uploadImageFromBase64AndEstablish()
    }
    setTimeout((() => {this.props.setScrubberToIndex(image_frameset_index)}), 1000)
  }

  uploadImageFromBase64AndEstablish() {
    const filename_obj = getFileAndDirNameFromUrl(this.state.image_url)
    this.props.postMakeUrlCall({
      data_uri: this.state.source_image_base64, //e.target.result,
      filename: filename_obj['filename'],
      directory: filename_obj['directory'],
      when_done: ((x)=>{
        this.props.establishNewEmptyMovie(
          this.state.movie_url,
          false,
          this.afterMovieCreated
        )
      }),
    })
  }

  showSourceFrameWrapper() {
    if (!this.state.movie_url || !this.state.image_url) {
      return ''
    }
    this.props.urlReturnsOk(this.state.image_url, this.enableMovie)
  }

  buildNoItemDataMessage() {
    if (Object.keys(this.state.items).length === 0) {
      return (
        <div className='row font-italic h5 ml-2'>
          No Application Data Exists for This Data Sifter
        </div>
      )
    }
  } 

  buildShowSourceFrameLink() {
    if (Object.keys(this.state.items).length === 0) {
      return ''
    }
    return (
      <div>
        <button
            className='btn btn-link'
            onClick={() => this.showSourceFrameWrapper() }
        >
          show source frame
        </button>
      </div>
    )
  }

  getAppRows() {
    let return_obj = []
    for (let i=0; i < this.state.rows.length; i++) {
      if (this.state.show_rowcol_id && !this.state.show_rowcol_id.startsWith('row_')) {
        break
      }
      let centers = []
      let start_x = -1
      let end_x = -1
      let y = -1
      const rowcol = this.state.rows[i]
      for (let j=0; j < rowcol.length; j++) {
        const item_id = rowcol[j]
        const item = this.state.items[item_id]
        const item_start = item['location']
        const item_end = [
          item['location'][0] + item['size'][0],
          item['location'][1] + item['size'][1]
        ]
        if (start_x === -1) {
          start_x = item_start[0]
          end_x = item_end[0]
          y = item_start[1]
        }
        if (item_start[0] < start_x) {
          start_x = item_start[0]
        }
        if (item_end[0] > end_x) {
          end_x = item_end[0]
        }
        centers.push(item['location'][0] + .5*item['size'][0])
      }
      const new_row_obj = {
        start: [start_x, y],
        end: [end_x, y],
        centers: centers,
      }
      return_obj.push(new_row_obj)
    }
    return return_obj
  }

  getAppLeftCols() {
    let return_obj = []
    for (let i=0; i < this.state.left_cols.length; i++) {
      if (this.state.show_rowcol_id && !this.state.show_rowcol_id.startsWith('left_col_')) {
        break
      }
      let centers = []
      let start_y = -1
      let end_y = -1
      let x = -1
      const rowcol = this.state.left_cols[i]
      for (let j=0; j < rowcol.length; j++) {
        const item_id = rowcol[j]
        const item = this.state.items[item_id]
        const item_start = item['location']
        const item_end = [
          item['location'][0] + item['size'][0],
          item['location'][1] + item['size'][1]
        ]
        if (start_y === -1) {
          start_y = item_start[1]
          end_y = item_start[1]
          x = item_start[0]
        }
        if (item_start[1] < start_y) {
          start_y = item_start[1]
        }
        if (item_end[1] > end_y) {
          end_y = item_end[1]
        }
        centers.push(item['location'][1]+ .5*item['size'][1])
      }
      return_obj.push({
        start: [x, start_y],
        end: [x, end_y],
        centers: centers,
      })
    }
    return return_obj
  }

  getAppRightCols() {
    let return_obj = []
    for (let i=0; i < this.state.right_cols.length; i++) {
      if (this.state.show_rowcol_id && !this.state.show_rowcol_id.startsWith('right_col_')) {
        break
      }
      let centers = []
      let start_y = -1
      let end_y = -1
      let all_x = []
      const rowcol = this.state.right_cols[i]
      for (let j=0; j < rowcol.length; j++) {
        const item_id = rowcol[j]
        const item = this.state.items[item_id]
        const item_start = item['location']
        const item_end = [
          item['location'][0] + item['size'][0],
          item['location'][1] + item['size'][1]
        ]
        all_x.push(item_end[0])
        if (start_y === -1) {
          start_y = item_start[1]
          end_y = item_start[1]
        }
        if (item_start[1] < start_y) {
          start_y = item_start[1]
        }
        if (item_end[1] > end_y) {
          end_y = item_end[1]
        }
        centers.push(item['location'][1]+ .5*item['size'][1])
      }
      const x = all_x.reduce((a, b) => a + b, 0) / all_x.length
      const build_obj = {
        start: [x, start_y],
        end: [x, end_y],
        centers: centers,
      }
      return_obj.push(build_obj)
    }
    return return_obj
  }

  getAppRowCols() {
    if (!this.state.id) {
      return {}
    }
    if (!this.state.show_app_rowcols) {
      return {}
    }
    let build_obj = {
      rows:[],
      left_cols:[],
      right_cols:[],
    }
    if (!this.weAreOnTheSourceFrame()) {
      return build_obj
    }

    const new_rows = this.getAppRows()
    build_obj['rows'] = new_rows

    const new_left_cols = this.getAppLeftCols()
    build_obj['left_cols'] = new_left_cols

    const new_right_cols = this.getAppRightCols()
    build_obj['right_cols'] = new_right_cols

    if (this.state.show_rowcol_id.startsWith('left_col_')) {
      const rowcol_num = parseInt(this.state.show_rowcol_id.substring(9))
      build_obj['left_cols'] = [build_obj['left_cols'][rowcol_num]]
    } else if (this.state.show_rowcol_id.startsWith('right_col_')) {
      const rowcol_num = parseInt(this.state.show_rowcol_id.substring(10))
      build_obj['right_cols'] = [build_obj['right_cols'][rowcol_num]]
    } else if (this.state.show_rowcol_id.startsWith('row_')) {
      const rowcol_num = parseInt(this.state.show_rowcol_id.substring(4))
      build_obj['rows'] = [build_obj['rows'][rowcol_num]]
    }
    return build_obj
  }

  deleteCurrentItem() {
    const cols_ret_obj = this.buildRightLeftColsWithoutItem() 
    const new_rows = this.buildRowsWithoutItem() 
    let deepCopyItems= JSON.parse(JSON.stringify(this.state.items))
    delete deepCopyItems[this.state.highlighted_item_id]
    const set_var = {
      rows: new_rows,
      left_cols: cols_ret_obj['left_cols'],
      right_cols: cols_ret_obj['right_cols'],
      items: deepCopyItems,
      highlighted_item_id: '',
    }
    this.setLocalStateVar(set_var)
  }

  buildItemAddRightButton() {
    return (
      <div
          className='d-inline ml-2'
      >
        <button
            className='btn btn-primary'
            onClick={() => this.addRightOfCurrentItem() }
        >
          Add Right
        </button>
      </div>
    )
  }

  buildItemAddLeftButton() {
    return (
      <div
          className='d-inline ml-2'
      >
        <button
            className='btn btn-primary'
            onClick={() => this.addLeftOfCurrentItem() }
        >
          Add Left
        </button>
      </div>
    )
  }

  buildItemDeleteButton() {
    return (
      <div
          className='d-inline'
      >
        <button
            className='btn btn-primary'
            onClick={() => this.deleteCurrentItem() }
        >
          Delete
        </button>
      </div>
    )
  }

  buildItemYLocationField(item) {
    return buildLabelAndTextInput(
      this.state.items[this.state.highlighted_item_id]['location'][1],
      'Y Location',
      'data_sifter_item_y_location',
      'item_y_location',
      8,
      ((value)=>{this.setCurrentItemVar('y_location', value)})
    )
  }

  buildItemXLocationField(item) {
    return buildLabelAndTextInput(
      this.state.items[this.state.highlighted_item_id]['location'][0],
      'X Location',
      'data_sifter_item_x_location',
      'item_x_location',
      8,
      ((value)=>{this.setCurrentItemVar('x_location', value)})
    )
  }

  buildItemWidthField(item) {
    return buildLabelAndTextInput(
      this.state.items[this.state.highlighted_item_id]['size'][0],
      'Width',
      'data_sifter_item_width',
      'item_width',
      4,
      ((value)=>{this.setCurrentItemVar('width', value)})
    )
  }

  insertCurrentItemInNewCol(col_type, build_cols) {
    const highlighted_item = this.state.items[this.state.highlighted_item_id]
    const stripped_ret_obj = this.buildRightLeftColsWithoutItem()
    let build_obj = {
      left_cols: stripped_ret_obj['left_cols'],
      right_cols: stripped_ret_obj['right_cols'],
    }
    let item_was_added = false
    build_cols = []
    if (col_type === 'left') {
      for (let i=0; i < this.state.left_cols.length; i++) {
        const col = this.state.left_cols[i]
        const first_item = this.state.items[col[0]]
        if (first_item['location'][0] < highlighted_item['location'][0]) {
          build_cols.push(col)
        } else if (!item_was_added) {
          build_cols.push([this.state.highlighted_item_id])
          build_cols.push(col)
          item_was_added = true
        } else {
          build_cols.push(col)
        }
      }
      if (build_cols.length === 0) {
        build_cols.push([this.state.highlighted_item_id])
      }
      build_obj['left_cols'] = build_cols
    } else if (col_type === 'right') {
      for (let i=0; i < this.state.right_cols.length; i++) {
        const col = this.state.right_cols[i]
        const first_item = this.state.items[col[0]]
        const hl_item_right_x = highlighted_item['location'][0] + highlighted_item['size'][0]
        if (first_item['location'][0] < hl_item_right_x) {
          build_cols.push(col)
        } else if (!item_was_added) {
          build_cols.push([this.state.highlighted_item_id])
          build_cols.push(col)
          item_was_added = true
        } else {
          build_cols.push(col)
        }
      }
      if (!item_was_added) {
        build_cols.push([this.state.highlighted_item_id])
      }
      if (build_cols.length === 0) {
        build_cols.push([this.state.highlighted_item_id])
      }
      build_obj['right_cols'] = build_cols
    }
    this.setLocalStateVar(build_obj)
  }

  alignCurrentItemToColumns(right_or_left, col_number) {
    const highlighted_item = this.state.items[this.state.highlighted_item_id]
    const stripped_ret_obj = this.buildRightLeftColsWithoutItem()
    let app_cols_list = this.state.left_cols
    if (right_or_left === 'right' || right_or_left === 'new_right_col') {
      app_cols_list = this.state.right_cols
    }

    let build_app_cols = []
    let item_was_added = false
    for (let i=0; i < app_cols_list.length; i++) {
      if (i !== col_number) {
        build_app_cols.push(app_cols_list[i])
        continue
      }
      const app_col = app_cols_list[i]
      let build_app_col = []
      for (let j=0; j < app_col.length; j++) {
        const app_item_id = app_col[j]
        const app_item = this.state.items[app_item_id]
        if (app_item['location'][0] <= highlighted_item['location'][0]) {
          build_app_col.push(app_item_id)
        } else if (!item_was_added) {
          build_app_col.push(this.state.highlighted_item_id)
          item_was_added = true
          continue
        } else {
          build_app_col.push(app_item_id)
        }
      }
      if (!item_was_added) {
        build_app_col.push(this.state.highlighted_item_id)
      }
      build_app_cols.push(build_app_col)
    }

    let build_obj = {
      left_cols: build_app_cols,
      right_cols: stripped_ret_obj['right_cols'],
    }
    if (right_or_left === 'right') {
      build_obj = {
        right_cols: build_app_cols,
        left_cols: stripped_ret_obj['left_cols'],
      }
    }
    this.setLocalStateVar(build_obj)
  }

  unalignCurrentItemColumn() {
    const ret_obj = this.buildRightLeftColsWithoutItem()
    const build_obj = {
      left_cols: ret_obj['left_cols'],
      right_cols: ret_obj['right_cols'],
    }
    this.setLocalStateVar(build_obj)
  }

  alignCurrentItemToRow(row_number) {
    const highlighted_item = this.state.items[this.state.highlighted_item_id]
    const stripped_rows = this.buildRowsWithoutItem()

    let build_rows = []
    let item_was_added = false
    for (let i=0; i < stripped_rows.length; i++) {
      if (i !== row_number) {
        build_rows.push(stripped_rows[i])
        continue
      }
      const app_row = stripped_rows[i]
      let build_app_row = []
      for (let j=0; j < app_row.length; j++) {
        const app_item_id = app_row[j]
        const app_item = this.state.items[app_item_id]
        if (app_item['location'][0] <= highlighted_item['location'][0]) {
          build_app_row.push(app_item_id)
        } else if (!item_was_added) {
          build_app_row.push(this.state.highlighted_item_id)
          item_was_added = true
          continue
        } else {
          build_app_row.push(app_item_id)
        }
      }
      if (!item_was_added) {
        build_app_row.push(this.state.highlighted_item_id)
      }
      build_rows.push(build_app_row)
    }
    this.setLocalStateVar({'rows': build_rows})
  }

  buildRowsWithoutItem() {
    let build_rows = []
    for (let i=0; i < this.state.rows.length; i++) {
      const row = this.state.rows[i]
      if (row.includes(this.state.highlighted_item_id)) {
        let build_row = []
        for (let j=0; j < row.length; j++) {
          if (row[j] !== this.state.highlighted_item_id) {
            build_row.push(row[j])
          }
        }
        if (build_row.length > 0) {
          build_rows.push(build_row)
        }
      } else {
        build_rows.push(this.state.rows[i])
      }
    }
    return build_rows
  }

  buildRightLeftColsWithoutItem() {
    let build_left_cols = []
    for (let i=0; i < this.state.left_cols.length; i++) {
      const left_col = this.state.left_cols[i]
      if (left_col.includes(this.state.highlighted_item_id)) {
        let build_left_col = []
        for (let j=0; j < left_col.length; j++) {
          if (left_col[j] !== this.state.highlighted_item_id) {
            build_left_col.push(left_col[j])
          }
        }
        if (build_left_col.length > 0) {
          build_left_cols.push(build_left_col)
        }
      } else {
        build_left_cols.push(this.state.left_cols[i])
      }
    }

    let build_right_cols = []
    for (let i=0; i < this.state.right_cols.length; i++) {
      const right_col = this.state.right_cols[i]
      if (right_col.includes(this.state.highlighted_item_id)) {
        let build_right_col = []
        for (let j=0; j < right_col.length; j++) {
          if (right_col[j] !== this.state.highlighted_item_id) {
            build_right_col.push(right_col[j])
          }
        }
        if (build_right_col.length > 0) {
          build_right_cols.push(build_right_col)
        }
      } else {
        build_right_cols.push(this.state.right_cols[i])
      }
    }

    const return_obj = {
      left_cols: build_left_cols,
      right_cols: build_right_cols,
    }
    return return_obj
  }

  buildDeleteColumnRow() {
    if (!this.state.left_cols && !this.state.right_cols) {
      return ''
    }
    if (!this.state.show_app_rowcols) {
      return ''
    }
    let values = [
      {'none': 'no column'},
      {'all': 'all columns'}
    ]
    for (let i=0; i < this.state.left_cols.length; i++) {
      values.push({
        ['left_col_' + i.toString()]:'left column '+i.toString(),
      })
    }
    for (let i=0; i < this.state.right_cols.length; i++) {
      values.push({
        ['right_col_' + i.toString()]:'right column '+i.toString(),
      })
    }
    const the_dropdown = buildLabelAndDropdown(
      values,
      '',
      this.state.delete_column_id,
      'data_sifter_delete_column_id',
      ((value)=>{this.setState({'delete_column_id': value})})
    )
    return (
      <div className='row'>
        <div className='d-inline'>
          Delete a column?
        </div>
        <div className='d-inline ml-2'>
          {the_dropdown}
        </div>
        <div className='d-inline ml-2'>
          <button
              className='btn btn-primary p-0'
              onClick={() => this.deleteSelectedColumn() }
          >
            Go
          </button>
        </div>
      </div>
    )
  }

  buildAlignToColumnDropdown() {
    let values = [
      {'none': 'no column'}
    ]
    for (let i=0; i < this.state.left_cols.length; i++) {
      values.push({
        ['left_col_' + i.toString()]:'left column '+i.toString(),
      })
    }
    values.push({'new_left_col': 'create new left column'})
    for (let i=0; i < this.state.right_cols.length; i++) {
      values.push({
        ['right_col_' + i.toString()]:'right column '+i.toString(),
      })
    }
    values.push({'new_right_col': 'create new right column'})
    let cur_value_string = 'none'
    const resp_obj = this.getItemAlignment(this.state.highlighted_item_id)
    if (resp_obj['col_align_type'] === 'right') {
      cur_value_string = 'right_col_' + resp_obj['col_num'].toString()
    } else if (resp_obj['col_align_type'] === 'left') {
      cur_value_string = 'left_col_' + resp_obj['col_num'].toString()
    }
    return buildLabelAndDropdown(
      values,
      'Align to Column',
      cur_value_string,
      'data_sifter_item_alignment',
      ((value)=>{this.setCurrentItemVar('col_alignment', value)})
    )
  }

  buildAlignToRowDropdown() {
    let values = []
    for (let i=0; i < this.state.rows.length; i++) {
      values.push({
        ['row_' + i.toString()]:'row '+i.toString(),
      })
    }
    let cur_value_string = 'none'
    const resp_obj = this.getItemAlignment(this.state.highlighted_item_id)
    if (resp_obj['row_num'] !== -1) {
      cur_value_string = 'row_' + resp_obj['row_num'].toString()
    }
    return buildLabelAndDropdown(
      values,
      'Align to Row',
      cur_value_string,
      'data_sifter_item_row_alignment',
      ((value)=>{this.setCurrentItemVar('row_alignment', value)})
    )
  }

  buildItemVerticalAlignmentField(item) {
    const resp_obj = this.getItemAlignment(this.state.highlighted_item_id)
    const cur_value = resp_obj['row_num']
    const align_dropdown = this.buildAlignToRowDropdown()
    let align_message = 'This item is not aligned with any rows'
    if (cur_value !== -1) {
      align_message = 'This item is aligned in row ' + cur_value.toString()
    }
    return (
      <div className='col'>
        <div className='row'>
          {align_message}
        </div>
        <div className='row'>
          {align_dropdown}
        </div>
      </div>
    )
  }

  buildItemHorizontalAlignmentField(item) {
    const resp_obj = this.getItemAlignment(this.state.highlighted_item_id)
    const cur_value = resp_obj['col_align_type']
    const col_num = resp_obj['col_num']
    const align_dropdown = this.buildAlignToColumnDropdown()
    let align_message = 'This item is not aligned with any columns'
    if (cur_value !== 'none') {
      align_message = 'This item is ' + cur_value + ' aligned in column ' + col_num.toString()
    }
    return (
      <div className='col'>
        <div className='row'>
          {align_message}
        </div>
        <div className='row'>
          {align_dropdown}
        </div>
      </div>
    )
  }

  getItemAlignment(item_id) {
    let alignment_obj = {}
    for (let i=0; i < this.state.left_cols.length; i++) {
      const left_col = this.state.left_cols[i]
      if (left_col.includes(item_id)) {
        alignment_obj['col_align_type'] = 'left'
        alignment_obj['col_num'] = i
        break
      }
    }
    for (let i=0; i < this.state.right_cols.length; i++) {
      const right_col = this.state.right_cols[i]
      if (right_col.includes(item_id)) {
        alignment_obj['col_align_type'] = 'right'
        alignment_obj['col_num'] = i
        break
      }
    }
    if (!Object.keys(alignment_obj).includes('col_align_type')) {
      alignment_obj['col_align_type'] = 'none'
      alignment_obj['col_num'] = 0
    }
    alignment_obj['row_num'] = -1
    for (let i=0; i < this.state.rows.length; i++) {
      const row = this.state.rows[i]
      if (row.includes(item_id)) {
        alignment_obj['row_num'] = i
        break
      }
    }
    return alignment_obj
  }

  buildItemMaskThisField(item) {
    if (item['type'] !== 'user_data') {
      return ''
    }
    let checked_val = ''
    if (item.mask_this_field) {
      checked_val = 'checked'
    }
    return (
      <div className='ml-2'>
        <div className='d-inline'>
          <input
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.setCurrentItemVar('mask_this_field', !item.mask_this_field)}
          />
        </div>
        <div className='d-inline'>
          Mask this Field?
        </div>
      </div>
    )
  }

  buildItemIsPiiField(item) {
    if (item['type'] !== 'user_data') {
      return ''
    }
    let checked_val = ''
    if (item.is_pii) {
      checked_val = 'checked'
    }
    return (
      <div className='ml-2'>
        <div className='d-inline'>
          <input
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.setCurrentItemVar('is_pii', !item.is_pii)}
          />
        </div>
        <div className='d-inline'>
          Is Pii
        </div>
      </div>
    )
  }

  buildItemTextField(item) {
    if (item['type'] !== 'label') {
      return ''
    }
    return buildLabelAndTextInput(
      item['text'],
      'Text',
      'data_sifter_item_text',
      'item_text',
      25,
      ((value)=>{this.setCurrentItemVar('text', value)})
    )
  }

  buildItemTypeDropdown(item) {
    const values = [
      {'label': 'label'},
      {'user_data': 'user data'}
    ]
    return buildLabelAndDropdown(
      values,
      'Type',
      item['type'],
      'data_sifter_item_type',
      ((value)=>{this.setCurrentItemVar('type', value)})
    )
  }

  buildItemEmptyValueField(item) {
    if (item['type'] !== 'user_data') {
      return ''
    }
    let cur_val = ''
    if (Object.keys(item).includes('empty_value')) {
      cur_val = item['empty_value']
    }
    return buildLabelAndTextInput(
      cur_val,
      'Empty Value',
      'data_sifter_item_empty_value',
      'item_empty_value',
      25,
      ((value)=>{this.setCurrentItemVar('empty_value', value)})
    )
  }

  buildItemFormElementTypeField(item) {
    const values = [
      {'none': 'no special container'},
      {'bg_color': 'different background color'},
      {'box': 'surrounding box'},
      {'dropdown': 'dropdown'}
    ]
    let current_value = 'none'
    if (Object.keys(item).includes('form_element_type')) {
      current_value = item['form_element_type']
    }
    return buildLabelAndDropdown(
      values,
      'Form Element Type',
      current_value,
      'data_sifter_item_form_element_type',
      ((value)=>{this.setCurrentItemVar('form_element_type', value)})
    )
  }

  buildItemSyntheticDatatypeField(item) {
    if (item['type'] !== 'user_data') {
      return ''
    }
    const values = [
      {'': ''},
      {'person.name': 'full name'},
      {'person.first_name': 'first name'},
      {'person.last_name': 'last name'},
      {'phone_number.phone_number': 'phone number'},
      {'ssn.ssn': 'social security number'},
      {'internet.email': 'email'},
      {'internet.url': 'url'},
      {'address.address': 'full physical address'},
      {'address.city': 'city'},
      {'address.state_short': 'state short'},
      {'address.state_full': 'state full'},
      {'address.country': 'country'},
      {'address.postcode': 'zip code'},
      {'address.street_address': 'street address'},
      {'credit_card.credit_card_expire': 'credit card expiration date MM/YY'},
      {'credit_card.credit_card_number': 'credit card number'},
      {'credit_card.security_code': 'credit card security code'},
      {'random-5': 'random alphanumeric - 5 chars'},
      {'random-10': 'random alphanumeric - 10 chars'},
      {'random-20': 'random alphanumeric - 20 chars'}
    ]
    let current_value = ''
    if (Object.keys(item).includes('synthetic_datatype')) {
      current_value = item['synthetic_datatype']
    }
    return buildLabelAndDropdown(
      values,
      'Synthetic Data Type',
      current_value,
      'data_sifter_item_synthetic_datatype',
      ((value)=>{this.setCurrentItemVar('synthetic_datatype', value)})
    )
  }

  setCurrentItemVar(var_name, var_value) {
    const old_value = this.state.items[this.state.highlighted_item_id][var_name] 
    let deepCopyItems= JSON.parse(JSON.stringify(this.state.items))
    if (var_name === 'width') {
      deepCopyItems[this.state.highlighted_item_id]['size'][0] = parseInt(var_value)
    } else if (var_name === 'x_location') {
      deepCopyItems[this.state.highlighted_item_id]['location'][0] = parseInt(var_value)
    } else if (var_name === 'y_location') {
      deepCopyItems[this.state.highlighted_item_id]['location'][1] = parseInt(var_value)
    } else if (var_name === 'col_alignment') {
      return this.setCurrentItemAlignment(var_value)
    } else if (var_name === 'row_alignment') {
      return this.setCurrentItemRowAlignment(var_value)
    } else {
      deepCopyItems[this.state.highlighted_item_id][var_name] = var_value
    }

    if (deepCopyItems[this.state.highlighted_item_id]['type'] === 'label') {
      deepCopyItems[this.state.highlighted_item_id]['is_pii'] = false
      deepCopyItems[this.state.highlighted_item_id]['mask_this_field'] = false
    } else if (var_name === 'type' && old_value === 'label' && var_value === 'user_data') {
      deepCopyItems[this.state.highlighted_item_id]['is_pii'] = true
      deepCopyItems[this.state.highlighted_item_id]['mask_this_field'] = true
    }

    this.setLocalStateVar('items', deepCopyItems)
  }

  getDataSifterHighlightedItemId() {
    return this.state.highlighted_item_id
  }

  loadCurrentDataSifter() {
    // we go here after loading a manual compile, so we want the source frame up and the data sifter loaded and panel expanded
    const cur_ds_id = this.props.current_ids['t1_scanner']['data_sifter']
    this.loadDataSifter(cur_ds_id)
    this.setState({
      show_app_rowcols: true,
      show_app_boxes: true,
      edit_ocr_data: false,
    })
    const ds_panel_is_expanded = document.getElementById('data_sifter_body_button').getAttribute('aria-expanded')
    if (ds_panel_is_expanded === 'false') {
      document.getElementById('data_sifter_body_button').click()
    }
    this.showSourceFrameWrapper()
  }

  itemContainsClick(item, clicked_coords) {
    const start = item['location']
    const end = [
      item['location'][0] + item['size'][0],
      item['location'][1] + item['size'][1]
    ]
    if (
      start[0] <= clicked_coords[0] &&
      clicked_coords[0] <= end[0] &&
      start[1] <= clicked_coords[1] &&
      clicked_coords[1] <= end[1]
    ) {
      return true
    }
  }

  setHighlightedItem(clicked_coords) {
    for (let i=0; i < Object.keys(this.state.items).length; i++) {
      const item_key = Object.keys(this.state.items)[i]
      const item = this.state.items[item_key]
      if (this.itemContainsClick(item, clicked_coords)) {
        this.setState({'highlighted_item_id': item_key})
      }
    }
  }

  getAppZones() {
    if (!this.state.id) {
      return {}
    }
    if (!this.state.show_app_boxes) {
      return {}
    }
    let build_obj = {}
    if (!this.weAreOnTheSourceFrame()) {
      return build_obj
    }
    for (let i=0; i < Object.keys(this.state.items).length; i++) {
      const item_id = Object.keys(this.state.items)[i]
      const item = this.state.items[item_id]
      const build_item = {
        location: item['location'],
        size: item['size'],
        type: item['type'],
      }
      build_obj[item_id] = build_item
    }
    return build_obj
  }

  submitForCompile() {
  //takes the ocr fields you have selected, packages them and submits as a DS compile manual job
  // what comes back is a data sifter to tweak
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.insights_image)
    const match_list = this.getCurrentOcrMatches() 
    const build_obj = {'movies': {}}
    build_obj['movies'][this.props.movie_url] = {'framesets': {}}
    build_obj['movies'][this.props.movie_url]['framesets'][frameset_hash] = match_list
    build_obj['movies']['source'] = {}
    build_obj['movies']['source'][this.props.movie_url] = {'framesets': {}}
    build_obj['movies']['source'][this.props.movie_url]['framesets'][frameset_hash] = {'images': [this.props.insights_image]}
    build_obj['movies']['source'][this.props.movie_url]['frames'] = [this.props.insights_image]

    this.props.submitInsightsJob('manual_compile_data_sifter', build_obj)
  }

  buildSubmitCompileButton() {
    if (!this.state.id) {
      return ''
    }
    return (
      <div
          className='d-inline ml-1'
      >
        <button
            className='btn btn-primary'
            onClick={() => this.submitForCompile() }
        >
          Submit for Compile
        </button>
      </div>
    )
  }

  getCurrentOcrMatches() {
    const cur_ocr_id = this.props.current_ids['t1_scanner']['ocr']
    if (!cur_ocr_id) {
      return {}
    }
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.insights_image)
    const cur_ocr_matches = this.props.tier_1_matches['ocr'][cur_ocr_id]
    if (!Object.keys(cur_ocr_matches['movies']).includes(this.props.movie_url)) {
      return {}
    }
    if (!Object.keys(cur_ocr_matches['movies'][this.props.movie_url]['framesets']).includes(frameset_hash)) {
      return {}
    }
    const match_list = cur_ocr_matches['movies'][this.props.movie_url]['framesets'][frameset_hash]
    return match_list
  }

  deleteOcrAreaCallback(end_coords) {
    const cur_ocr_id = this.props.current_ids['t1_scanner']['ocr']
    const match_list = this.getCurrentOcrMatches() 
    if (!match_list) {
      return
    }
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.insights_image)
    let something_changed = false
    let build_matches = {}
    for (let i=0; i < Object.keys(match_list).length; i++) {
      const the_key = Object.keys(match_list)[i]
      const the_ele = match_list[the_key]
      const ele_start = the_ele['location']
      const ele_end = [
        the_ele['location'][0] + the_ele['size'][0],
        the_ele['location'][1] + the_ele['size'][1]
      ]
      if (
        this.props.clicked_coords[0] <= ele_start[0] &&
        ele_start[0] <= end_coords[0] &&
        this.props.clicked_coords[1] <= ele_start[1] &&
        ele_start[1] <= end_coords[1] 
      ) {
        something_changed = true
      } else if (
        this.props.clicked_coords[0] <= ele_end[0] &&
        ele_end[0] <= end_coords[0] &&
        this.props.clicked_coords[1] <= ele_end[1] &&
        ele_end[1] <= end_coords[1] 
      ) {
        something_changed = true
      } else {
        build_matches[the_key] = the_ele
      }
      
      if (something_changed) {
        this.props.tier_1_matches['ocr'][cur_ocr_id]['movies'][this.props.movie_url]['framesets'][frameset_hash] = build_matches
      }
    }
    this.props.handleSetMode('ds_delete_ocr_area_1')
  }

  startDeleteOcrAreas() {
    this.props.handleSetMode('ds_delete_ocr_area_1')
  }

  buildDeleteOcrAreasButton() {
    return (
      <div
          className='d-inline ml-2'
      >
        <button
            className='btn btn-primary'
            onClick={() => this.startDeleteOcrAreas() }
        >
          Delete Ocr Areas
        </button>
      </div>
    )
  }

  buildEditOcrAndCompileRow() {
    const delete_ocr_areas_button = this.buildDeleteOcrAreasButton()
    const submit_for_compile_button = this.buildSubmitCompileButton()
    return (
      <div className='row mt-2'>
        {delete_ocr_areas_button}
        {submit_for_compile_button}
      </div>
    )
  }

  getShowType() {
    return this.state.show_type
  }

  buildShowType() {
    return buildLabelAndDropdown(
      [{'all': 'all'}, {'mask_items': 'mask_items'}, {'rows':'rows'}, {'left_cols':'left_cols'}, {'right_cols': 'right_cols'}, {'fast_pass_anchors': 'fast_pass_anchors'}],
      'Display Objects of This Type:',
      this.state.show_type,
      'show_type',
      ((value)=>{this.setLocalStateVar('show_type', value)})
    )
  }

  toggleLocalVar(var_name) {
    this.setLocalStateVar(var_name, !this.state[var_name])
  }

  buildToggleField(field_name, label) {
    let checked_val = ''
    if (this.state[field_name]) {
      checked_val = 'checked'
    }
    return (
      <div className='ml-2'>
        <div className='d-inline'>
          <input
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.toggleLocalVar(field_name)}
          />
        </div>
        <div className='d-inline'>
          {label}
        </div>
      </div>
    )
  }

  componentDidMount() {
    this.loadNewDataSifter()
    this.props.addInsightsCallback('getDataSifterShowType', this.getShowType)
    this.props.addInsightsCallback('getDataSifterAppZones', this.getAppZones)
    this.props.addInsightsCallback('getDataSifterAppRowCols', this.getAppRowCols)
    this.props.addInsightsCallback('getDataSifterHighlightedItemId', this.getDataSifterHighlightedItemId)
    this.props.addInsightsCallback('ds_delete_ocr_area_1', this.deleteOcrCallback1)
    this.props.addInsightsCallback('ds_delete_ocr_area_2', this.deleteOcrAreaCallback)
    this.props.addInsightsCallback('ds_load_current_data_sifter', this.loadCurrentDataSifter)
    this.props.addInsightsCallback('ds_add_item_1', this.addItemCallback1)
    this.props.addInsightsCallback('ds_add_item_2', this.addItemCallback2)
    this.props.addInsightsCallback('ds_inspect_item', this.setHighlightedItem)
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    let var_value_in_state = ''
    if (Object.keys(this.state).includes(var_name)) {
      var_value_in_state = this.state[var_name]
    }
    setLocalT1ScannerStateVar(var_name, var_value, var_value_in_state, this.doSave, this.setState, when_done)
  }

  buildLoadButton() {                                                           
    return buildTier1LoadButton(
      'data_sifter',
      this.props.tier_1_scanners['data_sifter'],
      ((value)=>{this.loadDataSifter(value)})
    )
  }

  loadDataSifter(data_sifter_id) {
    if (!data_sifter_id) {
      this.loadNewDataSifter()
    } else {
      const sam = this.props.tier_1_scanners['data_sifter'][data_sifter_id]
      this.setState({
        id: sam['id'],
        name: sam['name'],
        debug: sam['debug'],
        rows: sam['rows'],
        left_cols: sam['left_cols'],
        right_cols: sam['right_cols'],
        items: sam['items'],
        image_url: sam['image_url'],
        source_image_base64: sam['source_image_base64'],
        movie_url: sam['movie_url'],
        scale: sam['scale'],
        ocr_job_id: sam['ocr_job_id'],
        attributes: sam['attributes'],
        scan_level: sam['scan_level'],
      })
    }
    this.props.current_ids['t1_scanner']['data_sifter'] = data_sifter_id
    this.props.displayInsightsMessage('Data sifter has been loaded')
  }

  loadNewDataSifter() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['data_sifter'] = ''
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    const the_id = 'data_sifter_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      debug: false,
      rows: [],
      left_cols: [],
      right_cols: [],
      items: {},
      image_url: '',
      source_image_base64: '',
      movie_url: '',
      scale: '1:1',
      ocr_job_id: '',
      attributes: {},
      scan_level: 'tier_1',
    })
  }

  getDataSifterFromState() {
    let build_items = JSON.parse(JSON.stringify(this.state.items))
    for (let i=0; i < Object.keys(this.state.items).length; i++) {
      const item_key = Object.keys(this.state.items)[i]
      if (this.state.items[item_key]['type'] === 'user_data') {
        build_items[item_key]['text'] = ''
      }
    }
    const data_sifter = {                                                          
      id: this.state.id,
      name: this.state.name,
      debug: this.state.debug,
      rows: this.state.rows,
      left_cols: this.state.left_cols,
      right_cols: this.state.right_cols,
      items: build_items,
      image_url: this.state.image_url,
      source_image_base64: this.state.source_image_base64,
      movie_url: this.state.movie_url,
      scale: this.state.scale,
      ocr_job_id: this.state.ocr_job_id,
      attributes: this.state.attributes,
      scan_level: this.state.scan_level,
    }
    return data_sifter
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'data_sifter',
      this.getDataSifterFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.current_ids,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((data_sifter) => {
      this.props.saveScannerToDatabase(
        'data_sifter',
        data_sifter,
        (()=>{this.props.displayInsightsMessage('Selected Area has been saved to database')})
      )
    }))
  }

  buildMatchIdField2(job_type, is_required=true) {
    return buildMatchIdField(
        job_type,
        this.props.jobs,
        this.setLocalStateVar,
        this.state[job_type + '_job_id'],
        is_required
    )
  }

  buildScaleDropdown() {
    const values = [
      {'1:1': 'actual image scale only'},
      {'match_trigger': 'match trigger'}
    ]
    return buildLabelAndDropdown(
      values,
      'Scale',
      this.state.scale,
      'data_sifter_scale',
      ((value)=>{this.setLocalStateVar('scale', value)})
    )
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'data_sifter_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildScanLevelDropdown2() {
    const scan_level_dropdown = [
      {'tier_1': 'Tier 1 (select only)'},
      {'tier_3': 'Tier 3 (select and generate synthetic data)'}
    ]

    return buildLabelAndDropdown(
      scan_level_dropdown,
      'Scan Level',
      this.state.scan_level,
      'data_sifter_scan_level',
      ((value)=>{this.setLocalStateVar('scan_level', value)})
    )
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setState(
      {
        attributes: deepCopyAttributes,
      },
      this.doSave
    )
    this.props.displayInsightsMessage('Attribute was added')
  }

  doAddAttribute() {
    const value_ele = document.getElementById('data_sifter_attribute_value')
    const name_ele = document.getElementById('data_sifter_attribute_name')
    if (value_ele.value && name_ele.value) {
      this.setAttribute(name_ele.value, value_ele.value)
      name_ele.value = ''
      value_ele.value = ''
    }
  }

  deleteAttribute(name) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    if (!Object.keys(this.state.attributes).includes(name)) {
      return
    }
    delete deepCopyAttributes[name]
      this.setState(
      {
        attributes: deepCopyAttributes,
      },
      this.doSave
    )
    this.props.displayInsightsMessage('Attribute was deleted')
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'data_sifter_attribute_name',
      'data_sifter_attribute_value',
      (()=>{this.doAddAttribute()})
    )
    const attribs_list = buildAttributesAsRows(
      this.state.attributes,
      ((value)=>{this.deleteAttribute(value)})
    )
    return (
      <div>
        {add_attr_row}
        {attribs_list}
      </div>
    )
  }

  buildSaveToDatabaseButton() {
    return buildInlinePrimaryButton(
      'Save to DB',
      (()=>{this.doSaveToDatabase()})
    )
  }

  buildBuildButton() {
    const t1_sa_build_options = this.props.buildTier1RunOptions(
      'selected_area', 
      'data_sifter_build_t1_selected_area'
    )
    if (!t1_sa_build_options) {
      return
    }
    const data_sifter_id = this.props.current_ids['t1_scanner']['data_sifter']
    if (!Object.keys(this.props.tier_1_scanners['data_sifter']).includes(data_sifter_id)) {
      return
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='scanDataSifterBuildDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Build
        </button>
        <div className='dropdown-menu' aria-labelledby='scanDataSifterBuildDropdownButton'>
          {t1_sa_build_options}
        </div>
      </div>
    )
  }

  buildRunButtonWrapper() {
    if (!Object.keys(this.props.tier_1_scanners['data_sifter']).includes(this.state.id)) {
      return
    }
    return buildRunButton(
      this.props.tier_1_scanners, 'data_sifter', this.props.buildTier1RunOptions, this.props.submitInsightsJob
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'data_sifter',
      this.props.tier_1_scanners['data_sifter'],
      ((value)=>{this.deleteDataSifter(value)})
    )
  }

  deleteDataSifter(sam_id) {
    delete this.props.tier_1_scanners['data_sifter'][sam_id]
    if (sam_id === this.props.current_ids['t1_scanner']['data_sifter']) {
      this.props.current_ids['t1_scanner']['data_sifter'] = ''
    }
    this.props.displayInsightsMessage('Data Sifter was deleted')
  }

  clearMatches(scope) {
    return clearTier1Matches(
      'data_sifter',
      this.props.tier_1_matches,
      this.props.current_ids['t1_scanner']['data_sifter'],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildClearMatchesButton2() {
    const match_keys = Object.keys(this.props.tier_1_matches['data_sifter'])
    if (match_keys.length === 0) {
      return
    }
    return buildClearMatchesButton(
      'data_sifter',
      ((a)=>{this.clearMatches(a)})
    )
  }

  buildNormalScanModeButtonsRow() {
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const build_button = this.buildBuildButton()
    const run_button = this.buildRunButtonWrapper()
    return (
      <div className='row mt-2'>
        {load_button}
        {delete_button}
        {save_to_db_button}
        {clear_matches_button}
        {build_button}
        {run_button}
      </div>
    )
  }

  buildItemInfoArea() {
    if (!this.state.highlighted_item_id) {
      return ''
    }
    const item = this.state.items[this.state.highlighted_item_id]
    const type_dropdown = this.buildItemTypeDropdown(item)
    const text_field = this.buildItemTextField(item)
    const is_pii_field = this.buildItemIsPiiField(item)
    const mask_this_field = this.buildItemMaskThisField(item) 
    const horiz_alignment_field = this.buildItemHorizontalAlignmentField(item) 
    const vert_alignment_field = this.buildItemVerticalAlignmentField(item) 
    const width_field = this.buildItemWidthField(item)
    const delete_button = this.buildItemDeleteButton()
    const add_left_button = this.buildItemAddLeftButton()
    const add_right_button = this.buildItemAddRightButton()
    const x_location_field = this.buildItemXLocationField(item)
    const y_location_field = this.buildItemYLocationField(item)
    const synthetic_datatype_field = this.buildItemSyntheticDatatypeField(item)
    const form_element_type_field = this.buildItemFormElementTypeField(item)
    const empty_value_field = this.buildItemEmptyValueField(item)
    return (
      <div className='row border rounded p-1 m-2'>
        <div className='col ml-2'>
          <div className='row h5'>
            Selected Item Information
          </div>
          <div className='row'>
            id: {this.state.highlighted_item_id}
          </div>
          <div className='row'>
            {type_dropdown}
          </div>
          <div className='row'>
            {text_field}
          </div>
          <div className='row mt-2'>
            {synthetic_datatype_field}
          </div>
          <div className='row mt-2'>
            {form_element_type_field}
          </div>
          <div className='row mt-2'>
            {empty_value_field}
          </div>
          <div className='row'>
            {width_field}
          </div>
          <div className='row'>
            {x_location_field}
          </div>
          <div className='row'>
            {y_location_field}
          </div>
          <div className='row'>
            {is_pii_field}
          </div>
          <div className='row'>
            {mask_this_field}
          </div>
          <div className='row mt-2'>
            {horiz_alignment_field}
          </div>
          <div className='row mt-2'>
            {vert_alignment_field}
          </div>
          <div className='row mt-2'>
            {delete_button}
            {add_left_button}
            {add_right_button}
          </div>
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['data_sifter']) {
      return([])
    }
    const id_string = buildIdString(this.state.id, 'data_sifter', false)
    const name_field = this.buildNameField()
    const edit_ocr_data_checkbox = this.buildToggleField('edit_ocr_data', 'Build a Data Sifter from an Ocr scan')
    let show_app_boxes_checkbox = ''
    let show_app_rowcols_checkbox = ''
    let show_source_frame_link = ''
    let scale_dropdown = ''
    let debug_checkbox = ''
    let show_type_dropdown = ''
    let item_buttons_row = ''
    let scan_level_dropdown = ''
    let ocr_job_id_dropdown = ''
    let edit_ocr_and_compile_buttons_row = ''
    let normal_scan_mode_buttons_row = ''
    let item_data_message = ''
    if (this.state.edit_ocr_data) {
      edit_ocr_and_compile_buttons_row = this.buildEditOcrAndCompileRow()
    } else {
      if (this.weAreOnTheSourceFrame()) {
        show_app_boxes_checkbox = this.buildToggleField('show_app_boxes', 'Show App Boxes')
        show_app_rowcols_checkbox = this.buildToggleField('show_app_rowcols', 'Show App RowCols')
        item_buttons_row = this.buildBuildItemButtonsRow()
      } else {
        show_source_frame_link = this.buildShowSourceFrameLink()
      }
      scale_dropdown = this.buildScaleDropdown()
      debug_checkbox = this.buildToggleField('debug', 'Debug')
      show_type_dropdown = this.buildShowType()
      scan_level_dropdown = this.buildScanLevelDropdown2()
      ocr_job_id_dropdown = this.buildMatchIdField2('ocr', false) 
      normal_scan_mode_buttons_row = this.buildNormalScanModeButtonsRow()
      item_data_message = this.buildNoItemDataMessage()
    }
    const attributes_list = this.buildAttributesList()
    const item_info_area = this.buildItemInfoArea()
    const header_row = makeHeaderRow(
      'data sifter',
      'data_sifter_body',
      (() => this.props.toggleShowVisibility('data_sifter'))
    )
    const delete_column_row = this.buildDeleteColumnRow()
    const show_column_row = this.buildShowColumnRow()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='data_sifter_body' 
                className='row collapse bg-light'
            >
              <div id='data_sifter_main' className='col'>
                {normal_scan_mode_buttons_row}

                {edit_ocr_and_compile_buttons_row}

                {item_buttons_row}

                {item_data_message}

                <div className='row ml-1'>
                  <div className='col-6'>
                    <div className='row mt-2'>
                      {edit_ocr_data_checkbox}
                    </div>

                    <div className='row mt-2'>
                      {show_app_boxes_checkbox}
                    </div>

                    <div className='row mt-2'>
                      {show_app_rowcols_checkbox}
                    </div>

                    <div className='row mt-2'>
                      {show_source_frame_link}
                    </div>

                    <div className='row mt-2'>
                      {id_string}
                    </div>

                    <div className='row mt-2'>
                      {name_field}
                    </div>

                    <div className='row mt-2'>
                      {scale_dropdown}
                    </div>

                    <div className='row mt-2'>
                      {debug_checkbox}
                    </div>

                    <div className='row mt-2'>
                      {show_type_dropdown}
                    </div>

                    <div className='row mt-2'>
                      {scan_level_dropdown}
                    </div>

                    {delete_column_row}

                    {show_column_row}

                  </div>
                  <div className='col-6'>
                    {item_info_area}
                  </div>
                </div>

                <div className='row mt-1 mr-1 ml-1 border-top'>
                  <div className='row mt-2'>
                    {ocr_job_id_dropdown}
                  </div>

                  {attributes_list}
                </div>

                <div className='row mt-3 ml-1 mr-1'>
                  <ScannerSearchControls
                    search_attribute_name_id='data_sifter_database_search_attribute_name'
                    search_attribute_value_id='data_sifter_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='data_sifter'
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default DataSifterControls;
