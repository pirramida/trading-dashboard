import React from 'react';
import { Table, Tag } from 'antd';

const Logs = ({ logs }) => {
  const columns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'time',
      width: 180,
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      render: (text) => {
        let color = 'blue';
        if (text.includes('error') || text.includes('Error')) color = 'red';
        if (text.includes('success') || text.includes('Success')) color = 'green';
        if (text.includes('warning') || text.includes('Warning')) color = 'orange';
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  return (
    <div style={{ marginTop: 20 }}>
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="timestamp"
        size="small"
        pagination={{ pageSize: 5 }}
        scroll={{ y: 200 }}
      />
    </div>
  );
};

export default Logs;