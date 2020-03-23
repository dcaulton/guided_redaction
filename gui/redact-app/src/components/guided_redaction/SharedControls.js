import React from 'react';

export function buildLabelAndDropdown(allowed_values, label, value, element_name, onchange, raw_options='') {
  return (
    <div>
      <div className='d-inline'>
        {label}
      </div>
      <div className='d-inline ml-2'>
        <select
            name={element_name}
            value={value}
            onChange={(event) => onchange(event.target.value)}
        >
          {allowed_values.map((hash, index) => {
            const key = Object.keys(hash)[0]
            const display_text = hash[key]
            return (
              <option value={key} key={index}>{display_text}</option>
            )
          })}
          {raw_options}
        </select>
      </div>
    </div>
  )
}

export function buildLabelAndTextInput(value, label, element_id, title, size, onchange) {
  return (
    <div>
      <div className='d-inline'>
        {label}
      </div>
      <div
          className='d-inline ml-2'
      >
        <input
            id={element_id}
            title={title}
            size={size}
            value={value}
            onChange={(event) => onchange(event.target.value)}
        />
      </div>
    </div>
  )
}

export function buildAttributesAddRow(name_element_id, value_element_id, onclick) {
  return (
    <div>
      <div className='font-weight-bold'>
        Attributes
      </div>
      <div>
        <div className='d-inline ml-2'>
          Name:
        </div>
        <div className='d-inline ml-2'>
          <input
              id={name_element_id}
              size='25'
          />
        </div>
        <div className='d-inline ml-2'>
          Value:
        </div>
        <div className='d-inline ml-2'>
          <input
              id={value_element_id}
              size='25'
          />
        </div>
        <div className='d-inline ml-2'>
          <button
              className='btn btn-primary p-1'
              onClick={() => onclick()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

export function buildAttributesAsRows(the_attributes, delete_attribute_function) {
  return (
    <div>
    {Object.keys(the_attributes).map((name, index) => {
      return (
        <div key={index} className='mt-2'>
          <div className='d-inline'>
            Name:
          </div>
          <div className='d-inline ml-2'>
            {name}
          </div>
          <div className='d-inline ml-4'>
            Value:
          </div>
          <div className='d-inline'>
            {the_attributes[name]}
          </div>
          <div className='d-inline ml-2'>
            <button
                className='btn btn-primary'
                key={index}
                onClick={() => delete_attribute_function(name)}
            >
              Delete
            </button>
          </div>
        </div>
      )
    })}
  </div>
  )
}

export function buildInlinePrimaryButton(label, onclick) {
  return (
    <div
        className='d-inline'
    >
      <button
          className='btn btn-primary ml-2'
          onClick={() => onclick()}
      >
        {label}
      </button>
    </div>
  )
}

export function makeHeaderRow(label, body_id, plus_minus_onchange) {
  const datatarget = '#' + body_id
  return (
    <div className='row'>
      <div
        className='col-lg-10 h3'
      >
        {label}
      </div>
      <div className='col-lg-1 float-right'>
        <button
            className='btn btn-link'
            aria-expanded='false'
            data-target={datatarget}
            aria-controls={body_id}
            data-toggle='collapse'
            type='button'
        >
          +/-
        </button>
      </div>
      <div className='col-lg-1'>
        <div>
          <input
            className='mr-2 mt-3'
            type='checkbox'
            onChange={() => plus_minus_onchange()}
          />
        </div>
      </div>
    </div> 
  )
}

export function buildTier1LoadButton(scanner_type, hash_of_scanners, load_scanner_function) {
  const scanner_keys = Object.keys(hash_of_scanners)
  const dropdown_id = scanner_type + '_run_button_dropdown'
  const none_key = scanner_type  + '_load_none'
  return (
    <div key='x34' className='d-inline'>
      <button
          key='temp_names_button'
          className='btn btn-primary ml-2 dropdown-toggle'
          type='button'
          id={dropdown_id}
          data-toggle='dropdown'
          area-haspopup='true'
          area-expanded='false'
      >
        Load
      </button>
      <div className='dropdown-menu' aria-labelledby={dropdown_id}>
        {scanner_keys.map((value, index) => {
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => load_scanner_function(value)}
            >
              {hash_of_scanners[value]['name']}
            </button>
          )
        })}
        <button
            className='dropdown-item'
            key={none_key}
            onClick={() => load_scanner_function()}
        >
          new
        </button>
      </div>
    </div>
  )
}

export function buildTier1DeleteButton(scanner_type, hash_of_scanners, delete_scanner_function) {
  const scanner_keys = Object.keys(hash_of_scanners)
  const button_id = 'delete_' + scanner_type + '_button'
  return (
    <div className='d-inline'>
      <button
          className='btn btn-primary ml-2 dropdown-toggle'
          type='button'
          id={button_id}
          data-toggle='dropdown'
          area-haspopup='true'
          area-expanded='false'
      >
        Delete
      </button>
      <div className='dropdown-menu' aria-labelledby={button_id}>
        {scanner_keys.map((value, index) => {
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => delete_scanner_function(value)}
            >
              {hash_of_scanners[value]['name']}
            </button>
          )
        })}
      </div>
    </div>
  )
}
