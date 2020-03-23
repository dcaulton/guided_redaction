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
